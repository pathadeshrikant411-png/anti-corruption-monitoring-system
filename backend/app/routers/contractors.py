import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.database import get_db
from app.models import (
    User, Contractor, Contract, ContractDocument,
    ContractFinancial, FundRelease, Payment, AuditLog, Complaint, SystemSetting
)
from app.config import settings
from app.schemas import (
    ContractorRegistrationRequest,
    FullContractorProfileCreateRequest,
    ContractCreateRequest,
    ContractFinancialCreateRequest,
    ContractorResponse,
    ContractResponse,
    DocumentResponse,
    DocumentVerifyRequest,
    FundReleaseCreateRequest,
    PaymentCreateRequest,
    ComplaintResponse,
    ComplaintPhotoResponse,
    ComplaintStatusUpdateRequest
)
from app.security import hash_password
from app.deps import get_current_admin

router = APIRouter(prefix="/api/contractors", tags=["Contractor Management"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_unique_id(prefix: str) -> str:
    timestamp_str = datetime.now().strftime("%Y%m%d")
    unique_suffix = str(uuid.uuid4()).split("-")[0].upper()
    return f"{prefix}-{timestamp_str}-{unique_suffix}"

@router.post("", response_model=ContractorResponse)
def create_full_contractor_profile(
    payload: FullContractorProfileCreateRequest,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Wizard Endpoint: Creates full contractor profile across Phase 1, 2, 3 & 4."""
    reg = payload.contractor
    email = reg.email.lower().strip()
    mobile = reg.mobile_number.strip()
    reg_num = reg.contractor_reg_number.strip()

    if reg.password != reg.confirm_password:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match.")

    # Validation uniqueness
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="A user account with this email address already exists.")

    if db.query(Contractor).filter(Contractor.email == email).first():
        raise HTTPException(status_code=400, detail="Contractor email is already registered.")

    if db.query(Contractor).filter(Contractor.mobile_number == mobile).first():
        raise HTTPException(status_code=400, detail="Contractor mobile number is already registered.")

    if db.query(Contractor).filter(Contractor.contractor_reg_number == reg_num).first():
        raise HTTPException(status_code=400, detail="Contractor Registration Number is already registered.")

    # Create User account
    new_user = User(
        name=f"{reg.first_name} {reg.surname}",
        email=email,
        password_hash=hash_password(reg.password),
        user_type="contractor",
        role="contractor",
        is_active=True if reg.status == "Active" and not payload.is_draft else False,
        must_change_password=True
    )
    db.add(new_user)
    db.flush()

    # Create Contractor Profile
    contractor_code = generate_unique_id("CTR")
    status_str = "Draft" if payload.is_draft else reg.status

    new_contractor = Contractor(
        contractor_id=contractor_code,
        user_id=new_user.id,
        first_name=reg.first_name.strip(),
        fathers_name=reg.fathers_name.strip(),
        surname=reg.surname.strip(),
        mobile_number=mobile,
        email=email,
        contractor_reg_number=reg_num,
        company_name=reg.company_name.strip() if reg.company_name else None,
        business_address=reg.business_address.strip(),
        state=reg.state.strip(),
        district=reg.district.strip(),
        pin_code=reg.pin_code.strip(),
        photo_path=reg.photo_path.strip() if reg.photo_path else None,
        status=status_str
    )
    db.add(new_contractor)
    db.flush()

    # Add Contracts & Financial Specs (Phase 2 & Phase 3)
    if payload.contracts:
        for c_data in payload.contracts:
            contract_code = generate_unique_id("GOV-CNT")
            qr_token = generate_unique_id("QR-CNT")
            new_contract = Contract(
                contract_id=contract_code,
                qr_code_token=qr_token,
                contractor_id=new_contractor.id,
                title=c_data.title.strip(),
                department=c_data.department.strip(),
                office_name=c_data.office_name.strip(),
                location=c_data.location.strip(),
                contract_address=c_data.contract_address.strip() if c_data.contract_address else c_data.location.strip(),
                district=c_data.district.strip(),
                state=c_data.state.strip(),
                pin_code=c_data.pin_code.strip() if c_data.pin_code else reg.pin_code.strip(),
                contract_type=c_data.contract_type.strip(),
                description=c_data.description.strip(),
                tender_number=c_data.tender_number.strip(),
                work_order_number=c_data.work_order_number.strip(),
                agreement_number=c_data.agreement_number.strip(),
                start_date=c_data.start_date.strip(),
                end_date=c_data.end_date.strip(),
                responsibilities=c_data.responsibilities.strip(),
                status=c_data.status.strip(),
                progress_percentage=c_data.progress_percentage or 0
            )
            db.add(new_contract)
            db.flush()

            # Attach Financial Specs if provided (Phase 3)
            if payload.financials:
                fin = payload.financials
                new_fin = ContractFinancial(
                    contract_id=new_contract.id,
                    sanctioned_amount=fin.sanctioned_amount,
                    sanctioned_amount_words=fin.sanctioned_amount_words,
                    sanctioning_authority=fin.sanctioning_authority,
                    sanction_order_number=fin.sanction_order_number,
                    sanction_date=fin.sanction_date,
                    financial_year=fin.financial_year,
                    budget_head=fin.budget_head,
                    contract_value=fin.contract_value,
                    approved_variations=fin.approved_variations,
                    revised_contract_value=fin.revised_contract_value or fin.contract_value,
                    deductions_terms=fin.deductions_terms
                )
                db.add(new_fin)
                db.flush()

                # Add Fund Releases
                for fr in fin.fund_releases:
                    new_fr = FundRelease(
                        financial_id=new_fin.id,
                        installment_number=fr.installment_number,
                        release_order_number=fr.release_order_number,
                        release_date=fr.release_date,
                        amount_released=fr.amount_released,
                        payment_ref_number=fr.payment_ref_number,
                        remarks=fr.remarks
                    )
                    db.add(new_fr)

                # Add Payments
                for pm in fin.payments:
                    pay_code = generate_unique_id("PAY")
                    new_pm = Payment(
                        payment_id=pay_code,
                        financial_id=new_fin.id,
                        payment_date=pm.payment_date,
                        gross_amount=pm.gross_amount,
                        deductions=pm.deductions,
                        net_amount=pm.net_amount,
                        payment_ref_number=pm.payment_ref_number,
                        payment_status=pm.payment_status,
                        remarks=pm.remarks
                    )
                    db.add(new_pm)

    # Audit Logging
    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="CREATE_CONTRACTOR_PROFILE",
        entity_type="Contractor",
        entity_id=new_contractor.contractor_id,
        details=f"Contractor profile '{new_contractor.first_name} {new_contractor.surname}' created with status '{status_str}'."
    )
    db.add(audit)

    db.commit()
    db.refresh(new_contractor)
    return ContractorResponse.model_validate(new_contractor)

@router.get("", response_model=List[ContractorResponse])
def get_all_contractors(
    search: Optional[str] = Query(None, description="Search by name, ID, reg #, email, mobile, or company"),
    status_filter: Optional[str] = Query(None, alias="status"),
    state_filter: Optional[str] = Query(None, alias="state"),
    district_filter: Optional[str] = Query(None, alias="district"),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    query = db.query(Contractor)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Contractor.first_name.ilike(s),
                Contractor.surname.ilike(s),
                Contractor.contractor_id.ilike(s),
                Contractor.contractor_reg_number.ilike(s),
                Contractor.email.ilike(s),
                Contractor.mobile_number.ilike(s),
                Contractor.company_name.ilike(s)
            )
        )

    if status_filter:
        query = query.filter(Contractor.status == status_filter)

    if state_filter:
        query = query.filter(Contractor.state == state_filter)

    if district_filter:
        query = query.filter(Contractor.district == district_filter)

    contractors = query.order_by(desc(Contractor.created_at)).all()
    return [ContractorResponse.model_validate(c) for c in contractors]

@router.get("/settings/public-url")
def get_public_url_setting(
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Endpoint: Get currently configured public QR domain / web URL."""
    from app.routers.public import resolve_public_base_url, get_local_ip
    setting = db.query(SystemSetting).filter(SystemSetting.key == "PUBLIC_BASE_URL").first()
    db_val = setting.value if setting else None
    active_url = resolve_public_base_url(db)
    lan_ip = get_local_ip()
    
    return {
        "active_public_url": active_url,
        "configured_domain": db_val or settings.PUBLIC_BASE_URL or "",
        "lan_ip": lan_ip,
        "is_custom": bool(db_val or settings.PUBLIC_BASE_URL)
    }

@router.put("/settings/public-url")
def update_public_url_setting(
    payload: dict,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Endpoint: Save public QR domain (e.g. https://company-frays-establish.ngrok-free.dev)."""
    from app.routers.public import validate_public_url, resolve_public_base_url
    new_url = payload.get("public_url", "").strip().rstrip('/')
    if not new_url.startswith("http://") and not new_url.startswith("https://"):
        new_url = "https://" + new_url

    if not validate_public_url(new_url):
        raise HTTPException(
            status_code=400,
            detail="Public URL must be a valid HTTPS domain (e.g. https://company-frays-establish.ngrok-free.dev) and cannot be localhost or a local IP address."
        )

    for key_name in ["PUBLIC_APP_URL", "PUBLIC_BASE_URL"]:
        setting = db.query(SystemSetting).filter(SystemSetting.key == key_name).first()
        if not setting:
            setting = SystemSetting(key=key_name, value=new_url, description="Public Web Domain for QR Codes")
            db.add(setting)
        else:
            setting.value = new_url

    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="UPDATE_PUBLIC_APP_URL",
        entity_type="SystemSetting",
        entity_id="PUBLIC_APP_URL",
        details=f"Public QR Web Domain updated to '{new_url}'."
    )
    db.add(audit)
    db.commit()

    active_url = resolve_public_base_url(db)
    return {
        "message": "Public QR domain updated successfully.",
        "active_public_url": active_url,
        "configured_domain": active_url,
        "is_custom": True
    }

@router.get("/complaints", response_model=List[ComplaintResponse])
def get_all_citizen_complaints(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    contract_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Endpoint: Fetch all citizen complaints across government projects in real time."""
    query = db.query(Complaint)

    if contract_id:
        query = query.filter(Complaint.contract_id == contract_id)

    if status:
        query = query.filter(Complaint.status == status.strip())

    if search:
        search_term = f"%{search.strip()}%"
        query = query.join(Contract).filter(
            or_(
                Complaint.complaint_id.ilike(search_term),
                Complaint.issue_category.ilike(search_term),
                Complaint.description.ilike(search_term),
                Complaint.reporter_name.ilike(search_term),
                Contract.title.ilike(search_term),
                Contract.contract_id.ilike(search_term)
            )
        )

    complaints = query.order_by(desc(Complaint.created_at)).all()

    result = []
    for comp in complaints:
        contract = comp.contract
        contractor = contract.contractor if contract else None

        photos_list = [
            ComplaintPhotoResponse(
                id=p.id,
                photo_path=f"/api/public/complaints/photo-id/{p.id}",
                file_name=p.file_name,
                latitude=p.latitude,
                longitude=p.longitude,
                location_address=p.location_address,
                captured_at=p.captured_at
            ) for p in (comp.photos or [])
        ]

        resp = ComplaintResponse(
            id=comp.id,
            complaint_id=comp.complaint_id,
            contract_id=comp.contract_id,
            contract_code=contract.contract_id if contract else None,
            contract_title=contract.title if contract else None,
            department=contract.department if contract else None,
            contractor_name=f"{contractor.first_name} {contractor.surname}" if contractor else None,
            issue_category=comp.issue_category,
            description=comp.description,
            photo_path=f"/api/public/complaints/photo/{comp.complaint_id}" if comp.photo_path else None,
            photos=photos_list,
            reporter_name=comp.reporter_name,
            reporter_contact=comp.reporter_contact,
            latitude=comp.latitude,
            longitude=comp.longitude,
            location_address=comp.location_address,
            status=comp.status,
            admin_remarks=comp.admin_remarks,
            created_at=comp.created_at,
            updated_at=comp.updated_at
        )
        result.append(resp)

    return result

@router.put("/complaints/{complaint_id}/status", response_model=ComplaintResponse)
def update_complaint_status(
    complaint_id: str,
    payload: ComplaintStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Endpoint: Updates complaint status (New -> Under Review -> Verified -> Action Taken -> Resolved / Rejected) and admin remarks."""
    comp = db.query(Complaint).filter(
        (Complaint.complaint_id == complaint_id.strip())
    ).first()

    if not comp:
        raise HTTPException(status_code=404, detail="Citizen complaint record not found.")

    comp.status = payload.status.strip()
    if payload.admin_remarks is not None:
        comp.admin_remarks = payload.admin_remarks.strip()

    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="UPDATE_COMPLAINT_STATUS",
        entity_type="Complaint",
        entity_id=comp.complaint_id,
        details=f"Complaint status updated to '{comp.status}'. Remarks: {comp.admin_remarks or 'None'}"
    )
    db.add(audit)

    db.commit()
    db.refresh(comp)

    contract = comp.contract
    contractor = contract.contractor if contract else None

    photos_list = [
        ComplaintPhotoResponse(
            id=p.id,
            photo_path=f"/api/public/complaints/photo-id/{p.id}",
            file_name=p.file_name,
            latitude=p.latitude,
            longitude=p.longitude,
            location_address=p.location_address,
            captured_at=p.captured_at
        ) for p in (comp.photos or [])
    ]

    return ComplaintResponse(
        id=comp.id,
        complaint_id=comp.complaint_id,
        contract_id=comp.contract_id,
        contract_code=contract.contract_id if contract else None,
        contract_title=contract.title if contract else None,
        department=contract.department if contract else None,
        contractor_name=f"{contractor.first_name} {contractor.surname}" if contractor else None,
        issue_category=comp.issue_category,
        description=comp.description,
        photo_path=f"/api/public/complaints/photo/{comp.complaint_id}" if comp.photo_path else None,
        photos=photos_list,
        reporter_name=comp.reporter_name,
        reporter_contact=comp.reporter_contact,
        latitude=comp.latitude,
        longitude=comp.longitude,
        location_address=comp.location_address,
        status=comp.status,
        admin_remarks=comp.admin_remarks,
        created_at=comp.created_at,
        updated_at=comp.updated_at
    )

@router.get("/{contractor_id}", response_model=ContractorResponse)
def get_contractor_details(
    contractor_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found.")
    return ContractorResponse.model_validate(contractor)

@router.delete("/{contractor_id}")
def delete_contractor_forbidden(
    contractor_id: str,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Enforce strict data preservation: Contractors created by admin cannot be deleted."""
    raise HTTPException(
        status_code=403,
        detail="Permanent Governance Policy: Contractor profiles created by administration cannot be deleted. Deactivation is permitted to manage account access while preserving complete contract and audit records."
    )

@router.put("/{contractor_id}/status")
def update_contractor_status(
    contractor_id: int,
    status_payload: dict,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    new_status = status_payload.get("status")
    if new_status not in ["Active", "Inactive", "Draft"]:
        raise HTTPException(status_code=400, detail="Invalid status value.")

    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found.")

    contractor.status = new_status
    user = db.query(User).filter(User.id == contractor.user_id).first()
    if user:
        user.is_active = (new_status == "Active")

    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="UPDATE_CONTRACTOR_STATUS",
        entity_type="Contractor",
        entity_id=contractor.contractor_id,
        details=f"Contractor status updated to {new_status}."
    )
    db.add(audit)

    db.commit()
    return {"message": f"Contractor status successfully updated to {new_status}."}

# Document Upload, Replacement & Verification Endpoints
@router.post("/{contractor_id}/documents", response_model=DocumentResponse)
async def upload_contractor_document(
    contractor_id: int,
    document_name: str = Form(...),
    document_type: str = Form(...),
    contract_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    verification_status: Optional[str] = Form("Pending Verification"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found.")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPG, PNG, DOC, and DOCX files are allowed.")

    file_uuid = str(uuid.uuid4())
    saved_filename = f"{file_uuid}{ext}"
    saved_filepath = os.path.join(UPLOAD_DIR, saved_filename)

    with open(saved_filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(saved_filepath)
    if file_size > 10 * 1024 * 1024: # 10MB limit
        if os.path.exists(saved_filepath):
            os.remove(saved_filepath)
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 10MB.")

    doc_code = generate_unique_id("DOC")
    v_status = verification_status if verification_status in ["Verified", "Rejected", "Pending Verification"] else "Pending Verification"

    new_doc = ContractDocument(
        doc_id=doc_code,
        contractor_id=contractor.id,
        contract_id=contract_id,
        document_name=document_name.strip(),
        document_type=document_type.strip(),
        file_path=saved_filepath,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by=admin.name,
        verification_status=v_status,
        description=description.strip() if description else None
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return DocumentResponse.model_validate(new_doc)

@router.put("/documents/{doc_id}/replace", response_model=DocumentResponse)
async def replace_contractor_document(
    doc_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Endpoint: Replace existing document file."""
    doc = db.query(ContractDocument).filter(ContractDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document record not found.")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPG, PNG, DOC, and DOCX files are allowed.")

    file_uuid = str(uuid.uuid4())
    saved_filename = f"{file_uuid}{ext}"
    saved_filepath = os.path.join(UPLOAD_DIR, saved_filename)

    with open(saved_filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(saved_filepath)
    if file_size > 10 * 1024 * 1024:
        if os.path.exists(saved_filepath):
            os.remove(saved_filepath)
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 10MB.")

    # Delete old file if present
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    doc.file_path = saved_filepath
    doc.file_size = file_size
    doc.mime_type = file.content_type or "application/octet-stream"
    doc.uploaded_at = datetime.now(timezone.utc)
    doc.uploaded_by = admin.name
    doc.verification_status = "Pending Verification"

    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="REPLACE_DOCUMENT",
        entity_type="Document",
        entity_id=doc.doc_id,
        details=f"Document file for '{doc.document_name}' replaced by admin."
    )
    db.add(audit)

    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)

@router.delete("/documents/{doc_id}")
def delete_contractor_document(
    doc_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Endpoint: Delete document record and file."""
    doc = db.query(ContractDocument).filter(ContractDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document record not found.")

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    doc_name = doc.document_name
    doc_code = doc.doc_id
    db.delete(doc)

    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="DELETE_DOCUMENT",
        entity_type="Document",
        entity_id=doc_code,
        details=f"Document '{doc_name}' deleted by admin."
    )
    db.add(audit)

    db.commit()
    return {"message": f"Document '{doc_name}' successfully deleted."}

@router.put("/documents/{doc_id}/verify", response_model=DocumentResponse)
def verify_document(
    doc_id: int,
    payload: DocumentVerifyRequest,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    doc = db.query(ContractDocument).filter(ContractDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document record not found.")

    if payload.verification_status not in ["Verified", "Rejected", "Pending Verification"]:
        raise HTTPException(status_code=400, detail="Invalid verification status.")

    doc.verification_status = payload.verification_status
    doc.verification_remarks = payload.verification_remarks

    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="VERIFY_DOCUMENT",
        entity_type="Document",
        entity_id=doc.doc_id,
        details=f"Document '{doc.document_name}' verification set to {payload.verification_status}."
    )
    db.add(audit)

    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)

@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: int,
    inline: bool = Query(False),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    doc = db.query(ContractDocument).filter(ContractDocument.id == doc_id).first()
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

@router.post("/contracts/{contract_id}/regenerate-qr")
def regenerate_contract_qr_code(
    contract_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Endpoint: Regenerates the QR code token for a specific contract."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract record not found.")

    new_qr_token = generate_unique_id("QR-CNT")
    contract.qr_code_token = new_qr_token

    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="REGENERATE_CONTRACT_QR",
        entity_type="Contract",
        entity_id=contract.contract_id,
        details=f"QR code token regenerated for contract '{contract.title}'."
    )
    db.add(audit)

    db.commit()
    db.refresh(contract)
    return {"message": "QR code token regenerated successfully.", "qr_code_token": new_qr_token}

@router.post("/{contractor_id}/photo", response_model=ContractorResponse)
def upload_contractor_photo(
    contractor_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Endpoint: Upload or update official photo for a contractor profile."""
    contractor = None
    if contractor_id.isdigit():
        contractor = db.query(Contractor).filter(Contractor.id == int(contractor_id)).first()
    if not contractor:
        contractor = db.query(Contractor).filter(Contractor.contractor_id == contractor_id.strip()).first()
    
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor profile not found.")

    # Validate file format
    allowed_extensions = {".jpg", ".jpeg", ".png"}
    allowed_mimetypes = {"image/jpeg", "image/jpg", "image/png"}

    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in allowed_extensions and file.content_type not in allowed_mimetypes:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only JPG, JPEG, and PNG image files are allowed for contractor photos."
        )

    # Read and validate file size (max 5MB)
    contents = file.file.read()
    max_bytes = 5 * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds maximum allowed limit of 5 MB."
        )

    # Ensure contractor photos directory exists
    photos_dir = os.path.join(settings.UPLOAD_DIR, "contractor_photos")
    os.makedirs(photos_dir, exist_ok=True)

    # Clean up old photo file if present
    if contractor.photo_path:
        old_filename = os.path.basename(contractor.photo_path)
        old_file_path = os.path.join(photos_dir, old_filename)
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except Exception:
                pass

    # Save new file with unique filename
    unique_name = f"contractor_{contractor.id}_{uuid.uuid4().hex[:8]}{ext if ext in allowed_extensions else '.jpg'}"
    file_path = os.path.join(photos_dir, unique_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    contractor.photo_path = f"/api/public/uploads/contractor_photos/{unique_name}"
    
    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="UPDATE_CONTRACTOR_PHOTO",
        entity_type="Contractor",
        entity_id=contractor.contractor_id,
        details=f"Official profile photo updated for contractor '{contractor.first_name} {contractor.surname}'."
    )
    db.add(audit)
    db.commit()
    db.refresh(contractor)

    return ContractorResponse.model_validate(contractor)

@router.delete("/{contractor_id}/photo", response_model=ContractorResponse)
def remove_contractor_photo(
    contractor_id: str,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Admin Endpoint: Remove official photo for a contractor profile."""
    contractor = None
    if contractor_id.isdigit():
        contractor = db.query(Contractor).filter(Contractor.id == int(contractor_id)).first()
    if not contractor:
        contractor = db.query(Contractor).filter(Contractor.contractor_id == contractor_id.strip()).first()
    
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor profile not found.")

    if contractor.photo_path:
        photos_dir = os.path.join(settings.UPLOAD_DIR, "contractor_photos")
        old_filename = os.path.basename(contractor.photo_path)
        old_file_path = os.path.join(photos_dir, old_filename)
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except Exception:
                pass
        contractor.photo_path = None

        audit = AuditLog(
            user_id=admin.id,
            user_email=admin.email,
            action="REMOVE_CONTRACTOR_PHOTO",
            entity_type="Contractor",
            entity_id=contractor.contractor_id,
            details=f"Official profile photo removed for contractor '{contractor.first_name} {contractor.surname}'."
        )
        db.add(audit)
        db.commit()
        db.refresh(contractor)

    return ContractorResponse.model_validate(contractor)

