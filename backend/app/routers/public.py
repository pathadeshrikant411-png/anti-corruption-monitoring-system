import io
import os
import qrcode
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Contract, Contractor, ContractDocument, Complaint, ComplaintPhoto, SystemSetting, WorkUpdate
from app.config import settings
from app.schemas import (
    PublicContractDetailsResponse,
    PublicContractorSummary,
    ContractFinancialResponse,
    DocumentResponse,
    WorkUpdateResponse
)

router = APIRouter(prefix="/api/public", tags=["Public Contract Transparency"])

@router.get("/contracts/{qr_token}", response_model=PublicContractDetailsResponse)
@router.get("/contract/{qr_token}", response_model=PublicContractDetailsResponse)
@router.get("/projects/{qr_token}", response_model=PublicContractDetailsResponse)
@router.get("/project/{qr_token}", response_model=PublicContractDetailsResponse)
def get_public_contract_by_qr(
    qr_token: str,
    db: Session = Depends(get_db)
):
    """Public Endpoint: Fetch view-only details for a specific government contract using QR code token."""
    # Find contract by qr_code_token or contract_id
    contract = db.query(Contract).filter(
        (Contract.qr_code_token == qr_token.strip()) | (Contract.contract_id == qr_token.strip())
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Invalid or Unrecognized QR Code. The government contract record does not exist or the QR token has been tampered with.")

    contractor = db.query(Contractor).filter(Contractor.id == contract.contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor information missing.")

    # Include official documents for public transparency associated with this contract or contractor
    from sqlalchemy import or_, and_
    verified_docs_list = db.query(ContractDocument).filter(
        or_(
            ContractDocument.contract_id == contract.id,
            and_(
                ContractDocument.contractor_id == contract.contractor_id,
                ContractDocument.verification_status != "Rejected"
            )
        ),
        ContractDocument.verification_status != "Rejected"
    ).order_by(ContractDocument.uploaded_at.desc()).all()
    verified_docs = [DocumentResponse.model_validate(d) for d in verified_docs_list]

    contractor_summary = PublicContractorSummary(
        first_name=contractor.first_name,
        surname=contractor.surname,
        company_name=contractor.company_name,
        contractor_reg_number=contractor.contractor_reg_number,
        photo_path=contractor.photo_path
    )

    fin_resp = ContractFinancialResponse.model_validate(contract.financials) if contract.financials else None

    # Fetch work updates for public view belonging to this exact contract
    work_updates_list = db.query(WorkUpdate).filter(
        WorkUpdate.contract_id == contract.id
    ).order_by(WorkUpdate.work_date.desc(), WorkUpdate.created_at.desc()).all()
    work_updates = [WorkUpdateResponse.model_validate(w) for w in work_updates_list]

    return PublicContractDetailsResponse(
        contract_id=contract.contract_id,
        qr_code_token=contract.qr_code_token or contract.contract_id,
        title=contract.title,
        department=contract.department,
        office_name=contract.office_name,
        location=contract.location,
        contract_address=contract.contract_address,
        district=contract.district,
        state=contract.state,
        pin_code=contract.pin_code,
        contract_type=contract.contract_type,
        description=contract.description,
        tender_number=contract.tender_number,
        work_order_number=contract.work_order_number,
        agreement_number=contract.agreement_number,
        start_date=contract.start_date,
        end_date=contract.end_date,
        responsibilities=contract.responsibilities,
        status=contract.status,
        progress_percentage=contract.progress_percentage or 0,
        created_at=contract.created_at,
        contractor=contractor_summary,
        financials=fin_resp,
        verified_documents=verified_docs,
        work_updates=work_updates
    )

import socket

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

DEFAULT_PUBLIC_APP_URL = "https://company-frays-establish.ngrok-free.dev"

def validate_public_url(url_str: str) -> bool:
    if not url_str or not isinstance(url_str, str):
        return False
    s = url_str.strip().lower()
    
    # Must start with https://
    if not s.startswith("https://"):
        return False
        
    # Must not contain localhost, 127.0.0.1, 10.x.x.x, 192.168.x.x, or http://
    forbidden = ["localhost", "127.0.0.1", "10.", "192.168.", "http://"]
    for f in forbidden:
        if f in s:
            return False
            
    # Check 172.16.x.x - 172.31.x.x
    for octet in range(16, 32):
        if f"172.{octet}." in s:
            return False
            
    return True

def resolve_public_base_url(db: Session = None) -> str:
    # 1. Custom Admin Configured Public Domain in DB (e.g. PUBLIC_APP_URL / PUBLIC_BASE_URL)
    if db:
        try:
            setting = db.query(SystemSetting).filter(
                (SystemSetting.key == "PUBLIC_APP_URL") | (SystemSetting.key == "PUBLIC_BASE_URL")
            ).first()
            if setting and setting.value and setting.value.strip():
                val = setting.value.strip().rstrip('/')
                if not val.startswith("http://") and not val.startswith("https://"):
                    val = "https://" + val
                if validate_public_url(val):
                    return val
        except Exception:
            pass

    # 2. Production Environment Variable Config (PUBLIC_APP_URL / PUBLIC_BASE_URL)
    env_url = os.getenv("PUBLIC_APP_URL") or os.getenv("PUBLIC_BASE_URL") or getattr(settings, "PUBLIC_APP_URL", None)
    if env_url and env_url.strip():
        val = env_url.strip().rstrip('/')
        if not val.startswith("http://") and not val.startswith("https://"):
            val = "https://" + val
        if validate_public_url(val):
            return val

    # 3. Default Configured HTTPS Public Domain (NEVER localhost or local IP)
    return DEFAULT_PUBLIC_APP_URL

@router.get("/network-info")
def get_network_info(db: Session = Depends(get_db)):
    """Public Endpoint: Returns active public web domain for QR code generation."""
    public_url = resolve_public_base_url(db)
    return {
        "qr_base_url": public_url,
        "public_app_url": public_url,
        "is_custom_domain": True
    }

@router.get("/contracts/{qr_token}/qr-image")
@router.get("/contract/{qr_token}/qr-image")
@router.get("/projects/{qr_token}/qr-image")
@router.get("/project/{qr_token}/qr-image")
def get_contract_qr_image(
    qr_token: str,
    target_url: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Public Endpoint: Generates PNG QR Code image containing the accessible web URL."""
    contract = db.query(Contract).filter(
        (Contract.qr_code_token == qr_token.strip()) | (Contract.contract_id == qr_token.strip())
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract record not found.")

    token = contract.qr_code_token or contract.contract_id

    if target_url and target_url.strip():
        scan_url = target_url.strip()
    else:
        base_url = resolve_public_base_url(db)
        scan_url = f"{base_url}/public/project/{token}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(scan_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_bytes = img_byte_arr.getvalue()

    return Response(content=img_bytes, media_type="image/png")

import mimetypes

@router.get("/documents/{doc_id}/download")
@router.get("/documents/{doc_id}/view")
@router.get("/documents/{doc_id}/view.pdf")
def download_public_verified_document(
    doc_id: int,
    inline: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Public Endpoint: Download or view verified official contract document."""
    doc = db.query(ContractDocument).filter(
        ContractDocument.id == doc_id,
        ContractDocument.verification_status != "Rejected"
    ).first()

    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Verified document file not found or not approved for public viewing.")

    # MIME type detection
    mime_type = doc.mime_type
    guessed_type, _ = mimetypes.guess_type(doc.file_path)
    if guessed_type:
        mime_type = guessed_type
    elif doc.file_path.lower().endswith(".pdf"):
        mime_type = "application/pdf"
    elif doc.file_path.lower().endswith((".jpg", ".jpeg")):
        mime_type = "image/jpeg"
    elif doc.file_path.lower().endswith(".png"):
        mime_type = "image/png"
    elif doc.file_path.lower().endswith(".webp"):
        mime_type = "image/webp"

    ext = os.path.splitext(doc.file_path)[1] or ".pdf"
    safe_name = "".join(c for c in doc.document_name if c.isalnum() or c in (" ", "_", "-")).strip() or "document"
    filename = f"{safe_name}{ext}"

    disposition = "inline" if inline else "attachment"

    headers = {
        "Content-Disposition": f'{disposition}; filename="{filename}"',
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
    }

    return FileResponse(
        path=doc.file_path,
        filename=filename,
        media_type=mime_type or "application/octet-stream",
        headers=headers
    )

import json
import uuid
from datetime import datetime, timezone
from fastapi import UploadFile, File, Form

COMPLAINTS_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "complaints")
os.makedirs(COMPLAINTS_UPLOAD_DIR, exist_ok=True)

@router.post("/contracts/{qr_token}/complaints")
@router.post("/projects/{qr_token}/complaints")
@router.post("/project/{qr_token}/complaints")
def submit_citizen_complaint(
    qr_token: str,
    issue_category: str = Form(...),
    description: str = Form(...),
    reporter_name: Optional[str] = Form(None),
    reporter_contact: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location_address: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    photos: List[UploadFile] = File(None),
    photos_metadata: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Public Endpoint: Allows citizens to submit project issue complaints with GPS photos and live GPS location."""
    contract = db.query(Contract).filter(
        (Contract.qr_code_token == qr_token.strip()) | (Contract.contract_id == qr_token.strip())
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Invalid or Unrecognized QR Code. Complaint submission denied.")

    # Unique Complaint Code
    timestamp_str = datetime.now().strftime("%Y%m%d")
    unique_suffix = str(uuid.uuid4()).split("-")[0].upper()
    complaint_code = f"CMP-{timestamp_str}-{unique_suffix}"

    parsed_meta = []
    if photos_metadata:
        try:
            parsed_meta = json.loads(photos_metadata)
        except Exception:
            parsed_meta = []

    all_uploaded_files = []
    if photos:
        all_uploaded_files.extend([p for p in photos if p and p.filename])
    if photo and photo.filename and photo not in all_uploaded_files:
        all_uploaded_files.append(photo)

    first_photo_path = None

    new_complaint = Complaint(
        complaint_id=complaint_code,
        contract_id=contract.id,
        issue_category=issue_category.strip(),
        description=description.strip(),
        photo_path=None,
        reporter_name=reporter_name.strip() if reporter_name else None,
        reporter_contact=reporter_contact.strip() if reporter_contact else None,
        latitude=latitude,
        longitude=longitude,
        location_address=location_address.strip() if location_address else None,
        status="New"
    )

    db.add(new_complaint)
    db.flush()

    for idx, uploaded_file in enumerate(all_uploaded_files):
        ext = os.path.splitext(uploaded_file.filename)[1] or ".jpg"
        filename = f"{complaint_code}_{idx+1}_{uuid.uuid4().hex[:8]}{ext}"
        saved_path = os.path.join(COMPLAINTS_UPLOAD_DIR, filename)

        content = uploaded_file.file.read()
        file_size = len(content)
        
        mime_type = uploaded_file.content_type or "image/jpeg"
        if not mime_type.startswith("image/"):
            continue

        with open(saved_path, "wb") as buffer:
            buffer.write(content)

        if not first_photo_path:
            first_photo_path = saved_path

        photo_meta = parsed_meta[idx] if idx < len(parsed_meta) else {}
        photo_lat = photo_meta.get("latitude") if photo_meta.get("latitude") is not None else latitude
        photo_lng = photo_meta.get("longitude") if photo_meta.get("longitude") is not None else longitude
        photo_addr = photo_meta.get("location_address") or location_address

        new_photo = ComplaintPhoto(
            complaint_id=new_complaint.id,
            photo_path=saved_path,
            file_name=uploaded_file.filename,
            file_size=file_size,
            mime_type=mime_type,
            latitude=photo_lat,
            longitude=photo_lng,
            location_address=photo_addr
        )
        db.add(new_photo)

    new_complaint.photo_path = first_photo_path
    db.commit()
    db.refresh(new_complaint)

    return {
        "message": "Citizen complaint with GPS evidence submitted successfully.",
        "complaint_id": new_complaint.complaint_id,
        "contract_id": contract.contract_id,
        "contract_title": contract.title,
        "photos_count": len(all_uploaded_files),
        "status": new_complaint.status,
        "created_at": new_complaint.created_at
    }

@router.get("/complaints/photo/{complaint_id}")
def view_complaint_photo(
    complaint_id: str,
    db: Session = Depends(get_db)
):
    """Public Endpoint: View main uploaded photo evidence for a complaint."""
    complaint = db.query(Complaint).filter(
        (Complaint.complaint_id == complaint_id.strip())
    ).first()

    if not complaint or not complaint.photo_path or not os.path.exists(complaint.photo_path):
        raise HTTPException(status_code=404, detail="Complaint photo evidence not found.")

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
    }
    return FileResponse(path=complaint.photo_path, headers=headers)

@router.get("/complaints/photo-id/{photo_id}")
def view_complaint_photo_by_id(
    photo_id: int,
    db: Session = Depends(get_db)
):
    """Public Endpoint: View specific GPS photo evidence by photo ID."""
    photo = db.query(ComplaintPhoto).filter(ComplaintPhoto.id == photo_id).first()

    if not photo or not photo.photo_path or not os.path.exists(photo.photo_path):
        raise HTTPException(status_code=404, detail="GPS Photo evidence file not found.")

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
    }
    return FileResponse(path=photo.photo_path, headers=headers)

@router.get("/uploads/work_updates/{filename}")
def serve_work_update_photo(filename: str):
    """Public Endpoint: Serve work update proof photos."""
    file_path = os.path.join(settings.UPLOAD_DIR, "work_updates", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Work update photo not found.")
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
    }
    return FileResponse(file_path, headers=headers)

@router.get("/uploads/contractor_photos/{filename}")
def serve_contractor_photo(filename: str):
    """Public Endpoint: Serve official contractor profile photos safely."""
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(settings.UPLOAD_DIR, "contractor_photos", safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Contractor photo not found.")
    guessed_type, _ = mimetypes.guess_type(file_path)
    mime_type = guessed_type or "image/jpeg"
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
    }
    return FileResponse(file_path, media_type=mime_type, headers=headers)


