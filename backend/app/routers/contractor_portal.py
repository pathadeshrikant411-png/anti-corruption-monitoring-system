import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Form, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Contractor, Contract, ContractDocument, ContractFinancial, FundRelease, Payment, WorkUpdate
from app.schemas import (
    ContractorDashboardDataResponse,
    ContractorResponse,
    ContractResponse,
    DocumentResponse,
    ContractorFinancialSummary,
    WorkUpdateResponse
)
from app.deps import get_current_contractor
from app.config import settings

router = APIRouter(prefix="/api/contractor", tags=["Contractor Portal"])

@router.get("/dashboard", response_model=ContractorDashboardDataResponse)
def get_contractor_dashboard(
    contractor: Contractor = Depends(get_current_contractor),
    db: Session = Depends(get_db)
):
    """Contractor Portal Dashboard Data (Read-only for contractor)."""
    # Fetch assigned contracts
    contracts = db.query(Contract).filter(Contract.contractor_id == contractor.id).all()
    contract_responses = [ContractResponse.model_validate(c) for c in contracts]

    # Fetch documents
    documents = db.query(ContractDocument).filter(ContractDocument.contractor_id == contractor.id).all()
    doc_responses = [DocumentResponse.model_validate(d) for d in documents]

    # Calculate financial metrics across all assigned contracts
    total_sanctioned = 0.0
    total_contract_val = 0.0
    total_released = 0.0
    total_paid = 0.0

    for c in contracts:
        if c.financials:
            fin = c.financials
            total_sanctioned += fin.sanctioned_amount
            total_contract_val += (fin.revised_contract_value or fin.contract_value)
            
            for fr in fin.fund_releases:
                total_released += fr.amount_released

            for pm in fin.payments:
                if pm.payment_status in ["Approved", "Paid"]:
                    total_paid += pm.net_amount

    remaining_released_funds = total_released - total_paid
    unreleased_sanctioned = total_sanctioned - total_released
    pending_payment = total_contract_val - total_paid

    fin_summary = ContractorFinancialSummary(
        total_sanctioned_amount=round(total_sanctioned, 2),
        total_contract_value=round(total_contract_val, 2),
        total_funds_released=round(total_released, 2),
        total_payments_made=round(total_paid, 2),
        remaining_released_funds=round(remaining_released_funds, 2),
        unreleased_sanctioned_funds=round(unreleased_sanctioned, 2),
        pending_payment_amount=round(pending_payment, 2)
    )

    return ContractorDashboardDataResponse(
        contractor=ContractorResponse.model_validate(contractor),
        contracts=contract_responses,
        documents=doc_responses,
        financial_summary=fin_summary
    )

@router.get("/documents/{doc_id}/download")
def contractor_download_document(
    doc_id: int,
    inline: bool = Query(False),
    contractor: Contractor = Depends(get_current_contractor),
    db: Session = Depends(get_db)
):
    """Secure document download for contractor's own files."""
    doc = db.query(ContractDocument).filter(
        ContractDocument.id == doc_id,
        ContractDocument.contractor_id == contractor.id
    ).first()

    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found.")

    disposition = "inline" if inline else "attachment"
    filename = f"{doc.document_name}{os.path.splitext(doc.file_path)[1]}"

    return FileResponse(
        path=doc.file_path,
        filename=filename,
        media_type=doc.mime_type,
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'}
    )

@router.post("/contracts/{contract_id}/work-updates", response_model=WorkUpdateResponse)
def post_contractor_work_update(
    contract_id: int,
    work_date: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    progress_percentage: int = Form(0),
    status: str = Form("In Progress"),
    location_address: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    contractor: Contractor = Depends(get_current_contractor),
    db: Session = Depends(get_db)
):
    """Allow contractor to submit a dated work update with progress %, status, and site photo proof."""
    contract = db.query(Contract).filter(
        Contract.id == contract_id,
        Contract.contractor_id == contractor.id
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found or not assigned to your account.")

    photo_rel_path = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            raise HTTPException(status_code=400, detail="Photo file must be JPG, PNG, or WEBP.")

        upload_dir = os.path.join(settings.UPLOAD_DIR, "work_updates")
        os.makedirs(upload_dir, exist_ok=True)

        filename = f"WORK_{contract.contract_id}_{int(datetime.now().timestamp())}{ext}"
        full_path = os.path.join(upload_dir, filename)

        with open(full_path, "wb") as f:
            f.write(file.file.read())

        photo_rel_path = f"/api/public/uploads/work_updates/{filename}"

    # Create work update record
    work_update = WorkUpdate(
        contract_id=contract.id,
        contractor_id=contractor.id,
        work_date=work_date,
        title=title,
        description=description,
        progress_percentage=progress_percentage,
        status=status,
        photo_path=photo_rel_path,
        location_address=location_address
    )

    # Update contract progress percentage and status
    contract.progress_percentage = max(0, min(100, progress_percentage))
    if status in ["Awarded", "In Progress", "On Hold", "Completed", "Cancelled"]:
        contract.status = status

    db.add(work_update)
    db.commit()
    db.refresh(work_update)
    db.refresh(contract)

    return WorkUpdateResponse.model_validate(work_update)

