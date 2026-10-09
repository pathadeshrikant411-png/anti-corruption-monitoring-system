# Walkthrough: Admin Contractor Profile Creation System & Contractor Portal

The **Admin Contractor Profile Creation System** and **Contractor Portal** for the **Smart Government Contract Transparency & Anti-Corruption Monitoring System** have been built, fully integrated, and empirically verified.

---

## 🌟 What Was Built

### 1. Database Schema & ORM Expansion (`backend/app/models.py`)
- **`User` Table**: Unified authentication table supporting both `admin` and `contractor` accounts, password hashes, active flags, and `must_change_password` first-login flag.
- **`Contractor` Table**: Registration details (`contractor_id`, `first_name`, `fathers_name`, `surname`, `mobile_number`, `email`, `contractor_reg_number`, `company_name`, `business_address`, `state`, `district`, `pin_code`, `status`).
- **`Contract` Table**: Project details (`contract_id`, `title`, `department`, `office_name`, `location`, `district`, `state`, `contract_type`, `tender_number`, `work_order_number`, `agreement_number`, `start_date`, `end_date`, `responsibilities`, `status`).
- **`ContractDocument` Table**: Document metadata (`doc_id`, `document_name`, `document_type`, `file_path`, `file_size`, `mime_type`, `verification_status`, `verification_remarks`).
- **`ContractFinancial` Table**: Financial specifications (`sanctioned_amount`, `sanctioning_authority`, `contract_value`, `approved_variations`, `revised_contract_value`, `deductions_terms`).
- **`FundRelease` & `Payment` Tables**: Individual installment releases and payment transactions.
- **`AuditLog` Table**: Audit logging for contractor creations, document verifications, status updates, and financial edits.

### 2. Backend REST API Endpoints (`backend/app/routers/`)
- `POST /api/contractors`: Multi-phase creation wizard endpoint (Phases 1, 2, 3, 4).
- `GET /api/contractors`: Searchable, filterable list of all contractors.
- `GET /api/contractors/{id}`: Detailed contractor profile with assigned contracts and financial metrics.
- `PUT /api/contractors/{id}/status`: Activate or deactivate contractor profile.
- `POST /api/contractors/{id}/documents`: Upload PDF/JPG/PNG contract documents.
- `PUT /api/contractors/documents/{id}/verify`: Admin document verification & remarks update.
- `GET /api/contractors/documents/{id}/download`: Authenticated secure document streaming.
- `POST /api/auth/change-password`: Mandatory first-login password update endpoint.
- `GET /api/contractor/dashboard`: Contractor portal endpoint returning assigned contracts, verified documents, and calculated financial summaries.

### 3. Frontend Admin Portal UI (`frontend/src/`)
- **`AdminSidebar`**: Navigation sidebar with **Dashboard Overview**, **Create Contractor Profile**, and **View All Contractors**.
- **`CreateContractorPage`**: Responsive 4-Phase Wizard:
  - **Phase 1**: Registration & login credential details.
  - **Phase 2**: Assign government contracts & attach documents.
  - **Phase 3**: Financial specifications, fund release installments, payment records, and live dynamic calculated metrics.
  - **Phase 4**: Review page with section edit actions, legal confirmation checkbox, draft saving, and full profile creation.
- **`ContractorListPage`**: Searchable & filterable directory table with action menu (View Profile, Toggle Status).

### 4. Contractor Portal (`ContractorDashboardPage`)
- **Mandatory Password Change**: Forces contractor to change initial temporary password on first login.
- **My Profile Tab**: View personal and business registration details.
- **My Contracts Tab**: View assigned public work contracts, department info, and statuses.
- **My Documents Tab**: View and download verified project documents.
- **My Financial Summary Tab**: Read-only calculated summary (Sanctioned, Contract Value, Released, Paid, Remaining Released, Unreleased Sanctioned, Pending Payments).

---

## 🧪 Verification & Test Results

### Automated API & Unit Tests (`scratch/test_backend.py`)
Run results:
```text
Ran 2 tests in 1.186s

OK
[OK] Contractor full wizard profile creation passed
[OK] Contractor login with temporary password passed
[OK] Contractor portal read-only dashboard & financial math passed
```

### Frontend Production Build
```text
vite v5.4.21 building for production...
✓ 1553 modules transformed.
dist/index.html                   1.24 kB
dist/assets/index-ywycUtVt.css   31.01 kB
dist/assets/index-Cu7lp4sW.js   307.22 kB
✓ built in 6.28s
```

---

## 🚀 How to Access and Test

Both servers are currently active:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`

### Admin Operations Workflow:
1. Log in as Admin at `http://localhost:5173/login`:
   - **Email**: `admin@transparency.gov`
   - **Password**: `Admin@SecurePass2026!`
2. Click **Contractor Management → Create Contractor Profile** in the sidebar.
3. Fill out Phase 1, Phase 2, Phase 3, and Phase 4, then click **Create & Activate Profile**.

### Contractor Portal Workflow:
1. Log in as the newly created contractor at `http://localhost:5173/login` using the contractor's email and temporary password set by the admin.
2. Complete the **Mandatory Password Change**.
3. Explore the read-only **Contractor Dashboard** (`My Profile`, `My Contracts`, `My Documents`, `My Financial Summary`).
