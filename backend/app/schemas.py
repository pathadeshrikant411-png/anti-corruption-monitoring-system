from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# Authentication Schemas
class AdminLoginRequest(BaseModel):
    email: EmailStr = Field(..., example="admin@transparency.gov")
    password: str = Field(..., min_length=6, example="Admin@SecurePass2026!")

class ContractorChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str = "admin"
    must_change_password: bool = False

class AdminResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    user_type: str = "admin"
    must_change_password: bool = False
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    user_type: str
    is_active: bool
    must_change_password: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LoginSuccessResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    user_type: str = "admin"
    must_change_password: bool = False
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str

# Contractor Phase 1 Schemas
class ContractorRegistrationRequest(BaseModel):
    first_name: str
    fathers_name: str
    surname: str
    mobile_number: str
    email: EmailStr
    contractor_reg_number: str
    company_name: Optional[str] = None
    business_address: str
    state: str
    district: str
    pin_code: str
    photo_path: Optional[str] = None
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    status: str = "Active"

# Contract Creation Schema (Phase 2 Expanded)
class ContractCreateRequest(BaseModel):
    title: str
    department: str
    office_name: str
    location: str
    contract_address: Optional[str] = None
    district: str
    state: str
    pin_code: Optional[str] = None
    contract_type: str
    description: str
    tender_number: str
    work_order_number: str
    agreement_number: str
    start_date: str
    end_date: str
    responsibilities: str
    status: str = "Awarded"
    progress_percentage: int = 0

# Financial Specs & Transactions Schemas (Phase 3)
class FundReleaseCreateRequest(BaseModel):
    installment_number: int
    release_order_number: str
    release_date: str
    amount_released: float
    payment_ref_number: str
    remarks: Optional[str] = None

class PaymentCreateRequest(BaseModel):
    payment_date: str
    gross_amount: float
    deductions: float = 0.0
    net_amount: float
    payment_ref_number: str
    payment_status: str = "Paid"
    remarks: Optional[str] = None

class ContractFinancialCreateRequest(BaseModel):
    sanctioned_amount: float
    sanctioned_amount_words: Optional[str] = None
    sanctioning_authority: str
    sanction_order_number: str
    sanction_date: str
    financial_year: str
    budget_head: Optional[str] = None
    contract_value: float
    approved_variations: float = 0.0
    revised_contract_value: float = 0.0
    deductions_terms: Optional[str] = None
    fund_releases: List[FundReleaseCreateRequest] = []
    payments: List[PaymentCreateRequest] = []

# Combined Creation Wizard Request (Phase 4 Review & Submit)
class FullContractorProfileCreateRequest(BaseModel):
    contractor: ContractorRegistrationRequest
    contracts: List[ContractCreateRequest] = []
    financials: Optional[ContractFinancialCreateRequest] = None
    is_draft: bool = False

# Document Schema
class DocumentResponse(BaseModel):
    id: int
    doc_id: str
    contractor_id: int
    contract_id: Optional[int] = None
    document_name: str
    document_type: str
    file_size: int
    mime_type: str
    uploaded_at: datetime
    uploaded_by: str
    verification_status: str
    verification_remarks: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

class DocumentVerifyRequest(BaseModel):
    verification_status: str # Verified, Rejected, Pending Verification
    verification_remarks: Optional[str] = None

# Response Models for Views
class FundReleaseResponse(BaseModel):
    id: int
    installment_number: int
    release_order_number: str
    release_date: str
    amount_released: float
    payment_ref_number: str
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    id: int
    payment_id: str
    payment_date: str
    gross_amount: float
    deductions: float
    net_amount: float
    payment_ref_number: str
    payment_status: str
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ContractFinancialResponse(BaseModel):
    id: int
    sanctioned_amount: float
    sanctioned_amount_words: Optional[str] = None
    sanctioning_authority: str
    sanction_order_number: str
    sanction_date: str
    financial_year: str
    budget_head: Optional[str] = None
    contract_value: float
    approved_variations: float
    revised_contract_value: float
    deductions_terms: Optional[str] = None
    fund_releases: List[FundReleaseResponse] = []
    payments: List[PaymentResponse] = []

    class Config:
        from_attributes = True

class WorkUpdateCreateRequest(BaseModel):
    work_date: str
    title: str
    description: str
    progress_percentage: int = 0
    status: str = "In Progress"
    location_address: Optional[str] = None

class WorkUpdateResponse(BaseModel):
    id: int
    contract_id: int
    contractor_id: int
    work_date: str
    title: str
    description: str
    progress_percentage: int
    status: str
    photo_path: Optional[str] = None
    location_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ContractResponse(BaseModel):
    id: int
    contract_id: str
    contractor_id: int
    title: str
    department: str
    office_name: str
    location: str
    contract_address: Optional[str] = None
    district: str
    state: str
    pin_code: Optional[str] = None
    contract_type: str
    description: str
    tender_number: str
    work_order_number: str
    agreement_number: str
    start_date: str
    end_date: str
    responsibilities: str
    status: str
    progress_percentage: int = 0
    qr_code_token: Optional[str] = None
    created_at: datetime
    financials: Optional[ContractFinancialResponse] = None
    documents: List[DocumentResponse] = []
    work_updates: List[WorkUpdateResponse] = []

    class Config:
        from_attributes = True

class PublicContractorSummary(BaseModel):
    first_name: str
    surname: str
    company_name: Optional[str] = None
    contractor_reg_number: str
    photo_path: Optional[str] = None

class PublicContractDetailsResponse(BaseModel):
    contract_id: str
    qr_code_token: str
    title: str
    department: str
    office_name: str
    location: str
    contract_address: Optional[str] = None
    district: str
    state: str
    pin_code: Optional[str] = None
    contract_type: str
    description: str
    tender_number: str
    work_order_number: str
    agreement_number: str
    start_date: str
    end_date: str
    responsibilities: str
    status: str
    progress_percentage: int = 0
    created_at: datetime
    contractor: PublicContractorSummary
    financials: Optional[ContractFinancialResponse] = None
    verified_documents: List[DocumentResponse] = []
    work_updates: List[WorkUpdateResponse] = []

class ContractorResponse(BaseModel):
    id: int
    contractor_id: str
    user_id: int
    first_name: str
    fathers_name: str
    surname: str
    mobile_number: str
    email: str
    contractor_reg_number: str
    company_name: Optional[str] = None
    business_address: str
    state: str
    district: str
    pin_code: str
    photo_path: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    contracts: List[ContractResponse] = []
    documents: List[DocumentResponse] = []

    class Config:
        from_attributes = True

class ContractorFinancialSummary(BaseModel):
    total_sanctioned_amount: float
    total_contract_value: float
    total_funds_released: float
    total_payments_made: float
    remaining_released_funds: float
    unreleased_sanctioned_funds: float
    pending_payment_amount: float

class ContractorDashboardDataResponse(BaseModel):
    contractor: ContractorResponse
    contracts: List[ContractResponse]
    documents: List[DocumentResponse]
    financial_summary: ContractorFinancialSummary

# Citizen Complaint Schemas
class ComplaintCreateRequest(BaseModel):
    issue_category: str
    description: str
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None

class ComplaintStatusUpdateRequest(BaseModel):
    status: str # New, Under Review, Verified, Action Taken, Resolved, Rejected
    admin_remarks: Optional[str] = None

class ComplaintPhotoResponse(BaseModel):
    id: int
    photo_path: str
    file_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    captured_at: datetime

    class Config:
        from_attributes = True

class ComplaintResponse(BaseModel):
    id: int
    complaint_id: str
    contract_id: int
    contract_code: Optional[str] = None
    contract_title: Optional[str] = None
    department: Optional[str] = None
    contractor_name: Optional[str] = None
    issue_category: str
    description: str
    photo_path: Optional[str] = None
    photos: List[ComplaintPhotoResponse] = []
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    status: str
    admin_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
