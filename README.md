# Smart Government Contract Transparency & Anti-Corruption Monitoring System
## Phase 1: Admin Login System & Authentication Subsystem

A professional, modern, secure **Admin Login System** built for government contract transparency and anti-corruption oversight.

---

## 🏛️ System Features & Highlights

- **Government-Grade Security Theme**: Designed with custom palette tokens (Deep Navy `#0f172a`, Royal Blue `#1e3a8a`, Gold Accent, Slate `#f8fafc`).
- **RESTful Authentication API**: Built with Python & FastAPI.
- **ORM & Database Support**: PostgreSQL database schema managed via SQLAlchemy with auto-table generation and SQLite local testing fallback.
- **Bcrypt Password Hashing**: Passlib + Bcrypt implementation (never stores plaintext passwords).
- **JWT Token Protection**: In-memory React Context session handling (avoids storing JWT sensitive tokens in `localStorage`).
- **Brute-Force Rate Limiting**: Tracks failed login attempts and applies automatic 15-minute lockouts after 5 consecutive failures.
- **Initial Admin Seeder**: Automated seed script that provisions initial system admin credentials on launch.
- **Protected Dashboard Route**: Unauthenticated users trying to access `/dashboard` are securely redirected back to `/login`.
- **Responsive Layout**: Desktop, tablet, and mobile interface with glassmorphism card elevation and interactive Show/Hide password toggle.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React.js (Vite), Tailwind CSS, Lucide-React Icons, Axios |
| **Backend** | Python 3.12+, FastAPI, Uvicorn, Pydantic v2 |
| **Security** | PyJWT, Passlib, Bcrypt, OAuth2 Bearer Tokens |
| **Database** | PostgreSQL (Production) / SQLite (Fallback) via SQLAlchemy ORM |

---

## 🚀 Quick Setup & Run Instructions

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**
- **PostgreSQL** (Optional — if not running, backend seamlessly utilizes SQLite local fallback)

---

### 1. Backend Setup

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create/Verify `.env` configuration:
   ```bash
   # Copy example environment file if needed
   cp .env.example .env
   ```

5. Run the FastAPI server:
   ```bash
   python -m app.main
   ```
   *The backend server starts at `http://127.0.0.1:8000` and automatically seeds the initial admin account.*

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   cmd /c npm run dev
   ```
   *The frontend starts at `http://localhost:5173`.*

---

## 🔐 Initial Admin Credentials

On first launch, the system automatically creates an initial administrator account:

- **Email**: `admin@transparency.gov`
- **Password**: `Admin@SecurePass2026!`

*(Credentials can be updated in `backend/.env` via `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`)*

---

## 🧪 Testing the Complete Authentication Flow

1. Open `http://localhost:5173/login` in your web browser.
2. **Invalid Login Test**: Enter `wrong@email.com` or wrong password -> Observe clear, safe error message.
3. **Password Toggle**: Click the eye icon next to the password field to toggle visibility.
4. **Successful Login Test**: Enter `admin@transparency.gov` / `Admin@SecurePass2026!` -> Successfully redirected to `/dashboard`.
5. **Protected Route Verification**: Try opening `http://localhost:5173/dashboard` in a new Incognito window without logging in -> Automatically redirected back to `/login`.
6. **Logout Test**: Click **Sign Out** or **Terminate Session** in the top navigation or profile card -> Token cleared and redirected to `/login`.

---

## 📁 Repository Structure

```
Anti Curruption/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI Application Entrypoint
│   │   ├── config.py         # App & Environment Settings
│   │   ├── database.py       # SQLAlchemy Connection & Fallback
│   │   ├── models.py         # Admin DB Model
│   │   ├── schemas.py        # Pydantic Schemas
│   │   ├── security.py       # Passlib Bcrypt & JWT logic
│   │   ├── deps.py           # FastAPI Authentication Dependencies
│   │   ├── seed.py           # Initial Admin Seeder
│   │   └── routers/
│   │       └── auth.py       # Login, Logout, Me, Forgot-Password Endpoints
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/       # ProtectedRoute, Navbar, Toast, Spinner
│   │   ├── context/          # AuthContext in-memory state
│   │   ├── pages/            # LoginPage & DashboardPage
│   │   ├── services/         # Axios API Client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env
└── README.md
```
