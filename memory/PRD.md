# SHREE RAJ & CO - Register Management System (PRD)

## Overview
Mobile-first register management software for SHREE RAJ & CO chartered accounting firm with AI-powered features and shared-account authentication.

## Latest Updates - Auth & Bulk Import

### 🔐 Authentication System (NEW)
- **JWT-based authentication** with secure token storage (expo-secure-store)
- **Open registration** - any user can register
- **Shared data model**: All registered users see the same firm data (like Instagram shared accounts)
- Login screen with email/password
- Toggle between Login and Register modes
- Logout button in dashboard
- Test account: `admin@shreerajco.com` / `Admin@123`

### 📥 Bulk CSV Import (NEW)
- **Bulk client import** via CSV (file pick OR paste CSV text)
  - Required columns: firm_name, owner_name, mobile
  - Optional: email, address
- **Bulk document import** per client via CSV
  - Required columns: doc_name
  - Optional: status, storage_location, softcopy_location, last_entry_date, uploaded_to_accounting
- Error reporting for invalid rows
- Pick CSV file from device or paste CSV text

### 🏷️ UI Updates
- Renamed "Accounting" labels to "Uploaded" in document badges
- Form label updated to "Uploaded to System"
- Added user info display on dashboard
- Logout button (red) in welcome card

## All Implemented Features

### 1. Authentication ✅
- JWT-based login/register
- Token persistence via expo-secure-store
- Auto-redirect to login if not authenticated
- All users share same data

### 2. Document Management ✅
- Two statuses: pending, submitted
- Physical storage + softcopy locations
- Return status toggle (green/red)
- Last entry date with date picker
- Uploaded to system toggle (cloud icon)
- Documents fully editable

### 3. Client Management ✅
- Quick edit via icon
- Full edit modal in detail page
- Long press to delete
- Search functionality
- Bulk CSV import

### 4. Task Management ✅
- Create, edit, delete tasks
- Mark complete/incomplete
- Optional client association
- Document submission tracking

### 5. AI-Powered Features (OpenAI GPT-4o) ✅
- Personalized client messages (plain text for WhatsApp)
- Document cheatsheets (plain text)
- Daily summary reports (plain text)

### 6. Smart Reminders ✅
- In-app alerts for long-pending tasks
- Optional push notifications (requires dev build, gracefully degrades in Expo Go)

### 7. Branding ✅
- Raj & Co. logo as app icon, splash screen, and headers
- Professional blue (#1e3a8a) color scheme
- Logo displayed in auth screen

## Tech Stack
- **Backend**: FastAPI + MongoDB + JWT (python-jose) + bcrypt + Emergent LLM
- **Frontend**: Expo SDK 54 (React Native) + TypeScript + Expo Router + Secure Storage

## API Endpoints

### Auth (NEW)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user (requires Bearer token)

### Bulk Import (NEW)
- `POST /api/bulk/clients` - Bulk import clients from CSV (requires auth)
- `POST /api/bulk/documents` - Bulk import documents per client (requires auth)

### Data Endpoints (Public - login gate enforced in frontend)
- `GET/POST/PUT/DELETE /api/clients` - Client CRUD
- `GET/POST/PUT/DELETE /api/documents` - Document CRUD
- `GET/POST/PUT/DELETE /api/tasks` - Task CRUD
- `GET /api/dashboard/stats` - Statistics
- `POST /api/ai/generate-message` - AI client message
- `POST /api/ai/generate-cheatsheet` - AI cheatsheet
- `POST /api/ai/daily-summary` - AI daily summary

## Sample CSV Formats

### Clients CSV
```
firm_name,owner_name,mobile,email,address
ABC Ltd,John Doe,9876543210,john@abc.com,Mumbai
XYZ Corp,Jane Smith,9876543211,jane@xyz.com,Delhi
```

### Documents CSV (for one client)
```
doc_name,status,storage_location,uploaded_to_accounting
PAN Card,submitted,Cabinet A,true
Bank Statement,pending,,false
GST Return,pending,Shelf 2,false
```

## Deployment
- Use the **Publish** button (top-right) to deploy with the Raj & Co. logo as the official app icon
- Logo is already configured in app.json
- After publishing, the app can be installed on iOS/Android with proper branding
