# SmartRide

SmartRide is a full-stack vehicle rental management system built with React + Vite on the frontend and Spring Boot + PostgreSQL on the backend.

## Project structure

- `frontend/` – React + Tailwind frontend
- `backend/` – Java Spring Boot API
- `database/` – SQL schema and migration seed files
- `docs/` – API documentation and reference notes

## Phase 1 status

This repository now contains the initial project scaffold including:

- Vite React application setup with Tailwind CSS
- Spring Boot backend project with Maven wrapper
- Folder structure matching the requested SmartRide layout
- Environment examples and database schema placeholders

## Run locally

### Frontend

```powershell
cd SmartRide/frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173.

### Backend

```powershell
cd SmartRide/backend
.
\mvnw.cmd clean package
.
\mvnw.cmd spring-boot:run
```

Backend runs at http://localhost:8080.

### Admin bootstrap configuration

The backend creates the configured initial administrator on first startup. Set a unique password of at least 12 characters in the `ADMIN_PASSWORD` environment variable before starting Spring Boot. Admin credentials are not stored in the React application or returned by the API. If admin initialization is enabled and `ADMIN_PASSWORD` is missing, the backend fails startup with a configuration error. An existing admin account is never overwritten on restart.

For local PowerShell development, from the backend directory:

```powershell
$env:ADMIN_EMAIL="admin@smartride.com"
$env:ADMIN_PASSWORD="YourStrongUniquePassword"
$env:ADMIN_NAME="SmartRide Administrator"
$env:ADMIN_INITIALIZATION_ENABLED="true"
.\mvnw.cmd spring-boot:run
```

For local development, the backend imports `backend/.env` when started from the repository root, or `.env` when started from the backend directory. Copy `backend/.env.example` to `backend/.env` and set your local values there. Keep real values in this ignored file, environment variables, or a secret manager; never commit them to source control. For IDEs and deployments, provide the same settings through environment variables or a secret manager.

Admin login is available at http://localhost:5173/admin/login. Customer login remains at http://localhost:5173/login; vendor access uses the dedicated vendor login route described below.

### Vendor registration and approval

- Public vendor registration: http://localhost:5173/vendor/register
- Vendor sign-in: http://localhost:5173/vendor/login
- Admin review: sign in, then open **Pending Vendor Approvals** in the admin sidebar.
- Vendor applications, status changes, audit records, and notifications are stored in PostgreSQL. Approval and rejection are enforced by the backend.
- Uploaded identity and business documents are stored outside the frontend's public assets in `private-uploads/vendors` by default. Set `SMARTRIDE_VENDOR_UPLOAD_DIR` to a persistent, access-controlled directory in deployed environments. The admin and vendor document endpoints require authentication and authorization.
- Registration accepts PDF, PNG, and JPG/JPEG documents up to 5 MB each. Identity proof, PAN card, and address proof are required; profile image and business registration document are optional.
- Notification updates appear in the application. No email delivery is configured unless a mail integration is added separately.

## Notes

- Update the `.env` files before running the app.
- Use PostgreSQL with the credentials from the backend environment file.
- This scaffolding is being expanded phase-by-phase to match the vehicle rental product requirements.
