from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="super_admin")
    is_active = Column(Boolean, default=True, nullable=False)
    
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(50), nullable=False, default="contractor") # admin or contractor
    role = Column(String(50), nullable=False, default="contractor")
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    contractor_profile = relationship("Contractor", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(String(100), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    first_name = Column(String(100), nullable=False)
    fathers_name = Column(String(100), nullable=False)
    surname = Column(String(100), nullable=False)
    mobile_number = Column(String(20), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    contractor_reg_number = Column(String(100), unique=True, index=True, nullable=False)
    company_name = Column(String(255), nullable=True)
    business_address = Column(Text, nullable=False)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    pin_code = Column(String(20), nullable=False)
    photo_path = Column(String(500), nullable=True)
    
    status = Column(String(50), default="Draft", nullable=False) # Draft, Active, Inactive
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    user = relationship("User", back_populates="contractor_profile")
    contracts = relationship("Contract", back_populates="contractor", cascade="all, delete-orphan")
    documents = relationship("ContractDocument", back_populates="contractor", cascade="all, delete-orphan")
    work_updates = relationship("WorkUpdate", back_populates="contractor", cascade="all, delete-orphan")
    material_bills = relationship("MaterialBill", back_populates="contractor", cascade="all, delete-orphan")

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(String(100), unique=True, index=True, nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    office_name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    contract_address = Column(Text, nullable=True)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pin_code = Column(String(20), nullable=True)
    contract_type = Column(String(100), nullable=False) # Road, Building, Bridge, Water Supply, Electrical, Sewerage, etc.
    description = Column(Text, nullable=False)
    tender_number = Column(String(100), nullable=False)
    work_order_number = Column(String(100), nullable=False)
    agreement_number = Column(String(100), nullable=False)
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20), nullable=False)
    responsibilities = Column(Text, nullable=False)
    status = Column(String(50), default="Awarded", nullable=False) # Draft, Awarded, In Progress, On Hold, Completed, Cancelled
    progress_percentage = Column(Integer, default=0, nullable=False)
    qr_code_token = Column(String(100), unique=True, index=True, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    contractor = relationship("Contractor", back_populates="contracts")
    financials = relationship("ContractFinancial", back_populates="contract", uselist=False, cascade="all, delete-orphan")
    documents = relationship("ContractDocument", back_populates="contract", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="contract", cascade="all, delete-orphan")
    work_updates = relationship("WorkUpdate", back_populates="contract", cascade="all, delete-orphan")
    material_bills = relationship("MaterialBill", back_populates="contract", cascade="all, delete-orphan")

class ContractDocument(Base):
    __tablename__ = "contract_documents"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(100), unique=True, index=True, nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    
    document_name = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    uploaded_by = Column(String(255), nullable=False)
    
    verification_status = Column(String(50), default="Pending Verification", nullable=False) # Pending Verification, Verified, Rejected
    verification_remarks = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    contractor = relationship("Contractor", back_populates="documents")
    contract = relationship("Contract", back_populates="documents")

class ContractFinancial(Base):
    __tablename__ = "contract_financials"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), unique=True, nullable=False)
    
    sanctioned_amount = Column(Float, default=0.0, nullable=False)
    sanctioned_amount_words = Column(String(255), nullable=True)
    sanctioning_authority = Column(String(255), nullable=False)
    sanction_order_number = Column(String(100), nullable=False)
    sanction_date = Column(String(20), nullable=False)
    financial_year = Column(String(50), nullable=False)
    budget_head = Column(String(255), nullable=True)
    
    contract_value = Column(Float, default=0.0, nullable=False)
    approved_variations = Column(Float, default=0.0, nullable=False)
    revised_contract_value = Column(Float, default=0.0, nullable=False)
    deductions_terms = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    contract = relationship("Contract", back_populates="financials")
    fund_releases = relationship("FundRelease", back_populates="financial", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="financial", cascade="all, delete-orphan")

class FundRelease(Base):
    __tablename__ = "fund_releases"

    id = Column(Integer, primary_key=True, index=True)
    financial_id = Column(Integer, ForeignKey("contract_financials.id"), nullable=False)
    
    installment_number = Column(Integer, nullable=False)
    release_order_number = Column(String(100), nullable=False)
    release_date = Column(String(20), nullable=False)
    amount_released = Column(Float, nullable=False)
    payment_ref_number = Column(String(100), nullable=False)
    remarks = Column(Text, nullable=True)
    supporting_document_path = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    financial = relationship("ContractFinancial", back_populates="fund_releases")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(100), unique=True, index=True, nullable=False)
    financial_id = Column(Integer, ForeignKey("contract_financials.id"), nullable=False)
    
    payment_date = Column(String(20), nullable=False)
    gross_amount = Column(Float, nullable=False)
    deductions = Column(Float, default=0.0, nullable=False)
    net_amount = Column(Float, nullable=False)
    payment_ref_number = Column(String(100), nullable=False)
    payment_status = Column(String(50), default="Pending", nullable=False) # Pending, Approved, Paid, Rejected
    remarks = Column(Text, nullable=True)
    supporting_document_path = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    financial = relationship("ContractFinancial", back_populates="payments")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String(100), unique=True, index=True, nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    
    issue_category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    photo_path = Column(String(500), nullable=True)
    
    reporter_name = Column(String(150), nullable=True)
    reporter_contact = Column(String(100), nullable=True)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_address = Column(Text, nullable=True)
    
    status = Column(String(50), default="New", nullable=False) # New, Under Review, Verified, Action Taken, Resolved, Rejected
    admin_remarks = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    contract = relationship("Contract", back_populates="complaints")
    photos = relationship("ComplaintPhoto", back_populates="complaint", cascade="all, delete-orphan")

class ComplaintPhoto(Base):
    __tablename__ = "complaint_photos"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    
    photo_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_address = Column(Text, nullable=True)
    captured_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    complaint = relationship("Complaint", back_populates="photos")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String(255), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

class WorkUpdate(Base):
    __tablename__ = "work_updates"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id", ondelete="CASCADE"), nullable=False)
    
    work_date = Column(String(20), nullable=False) # e.g. "2026-09-27"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    progress_percentage = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="In Progress")
    photo_path = Column(String(500), nullable=True)
    location_address = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    contract = relationship("Contract", back_populates="work_updates")
    contractor = relationship("Contractor", back_populates="work_updates")

class MaterialBill(Base):
    __tablename__ = "material_bills"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id", ondelete="CASCADE"), nullable=False)

    bill_number = Column(String(100), nullable=False)
    supplier_name = Column(String(255), nullable=False)
    material_description = Column(Text, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    bill_date = Column(String(20), nullable=False)
    bill_file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    contract = relationship("Contract", back_populates="material_bills")
    contractor = relationship("Contractor", back_populates="material_bills")

