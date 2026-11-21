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

For local PowerShell development, from the backend directory, provide the database connection and required secrets as process environment variables:

```powershell
$env:ADMIN_EMAIL="admin@smartride.com"
$env:ADMIN_PASSWORD="YourStrongUniquePassword"
$env:ADMIN_NAME="SmartRide Administrator"
$env:ADMIN_INITIALIZATION_ENABLED="true"
$env:FLEET_MANAGER_EMAIL="fleetmanager@smartride.com"
$env:FLEET_MANAGER_PASSWORD="YourOtherStrongUniquePassword"
$env:FLEET_MANAGER_INITIALIZATION_ENABLED="true"
$env:JWT_SECRET="<random secret with at least 32 bytes>"
$env:DATABASE_URL="jdbc:postgresql://localhost:5432/smartride"
$env:DB_USERNAME="smartride"
$env:DB_PASSWORD="<database password>"
.\mvnw.cmd spring-boot:run
```

`backend/src/main/resources/application.properties` is the backend's runtime Spring configuration. It does not import `.env`; `backend/.env.example` is an optional reference only and is never loaded. Supply secret values through environment variables or a secret manager, and do not commit real credentials to the properties file. For IDEs and deployments, provide the same environment variables through the launch configuration or secret manager.

Admin login is available at http://localhost:5173/admin/login. Customer login remains at http://localhost:5173/login; vendor access uses the dedicated vendor login route described below.

### Fleet Manager account and operations

The backend bootstraps the configured Fleet Manager account on first startup when `FLEET_MANAGER_INITIALIZATION_ENABLED=true`. Set `FLEET_MANAGER_EMAIL`, `FLEET_MANAGER_NAME`, and a unique `FLEET_MANAGER_PASSWORD` of at least 12 characters in `application.properties` or as environment variables before starting/restarting the backend. The password is BCrypt-hashed and synchronized from configuration at startup for an existing Fleet Manager account with that email; a password changed in the UI will therefore be replaced at the next restart unless the configured password is changed too. The default development email is `fleetmanager@smartride.com`; the password has no default.

Fleet Manager login is available at http://localhost:5173/fleet-manager/login. The dashboard supports scoped fleet/driver views, vehicle assignments, active rentals, maintenance scheduling and requests, utilization, reports, notifications, profile, and preferences. An Admin must first use **Fleet Manager Access** in the admin sidebar to grant approved vehicles and active approved drivers. Managers can only operate on explicitly granted resources; vehicle approval, vendor pricing, and ownership remain Admin/vendor responsibilities.

Fleet access grants, assignments, maintenance records, and manager preferences are stored in PostgreSQL. The matching table definitions are included in `database/schema.sql` and are also created by the backend schema initializer.

### Vendor registration and approval

- Public vendor registration: http://localhost:5173/vendor/register
- Vendor sign-in: http://localhost:5173/vendor/login
- Admin review: sign in, then open **Pending Vendor Approvals** in the admin sidebar.
- Vendor applications, status changes, audit records, and notifications are stored in PostgreSQL. Approval and rejection are enforced by the backend.
- Uploaded identity and business documents are stored outside the frontend's public assets in `private-uploads/vendors` by default. Set `SMARTRIDE_VENDOR_UPLOAD_DIR` to a persistent, access-controlled directory in deployed environments. The admin and vendor document endpoints require authentication and authorization.
- Registration accepts PDF, PNG, and JPG/JPEG documents up to 5 MB each. Identity proof, PAN card, and address proof are required; profile image and business registration document are optional.
- Vehicle listing photos are uploaded to Cloudinary. `application.properties` maps `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`; supply these through the launch environment or a secret manager, not a committed properties file. Registration/KYC and vehicle paperwork remain in private local storage. Previously uploaded local vehicle photos continue to be served.
- Notification updates appear in the application. No email delivery is configured unless a mail integration is added separately.

## Notes

- Update the `.env` files before running the app.
- Use PostgreSQL with the credentials from the backend environment file.
- This scaffolding is being expanded phase-by-phase to match the vehicle rental product requirements.
