# SHREE RAJ & CO - Register Management System (PRD)

## Overview
Mobile-first register management software for SHREE RAJ & CO chartered accounting firm with AI-powered features.

## Implemented Features

### 1. Document Management System ✅
- Client list with detailed contact information (firm name, owner, mobile, email, address)
- Document tracking with two statuses: **pending** and **submitted** (required removed per user request)
- Physical storage location tracking (e.g., Cabinet A, Shelf 2)
- Softcopy location tracking (e.g., D:/Clients/ABC Ltd/)
- **Return status toggle** (Green = Returned, Red = Pending)
- **Last entry date** in accounting software with date picker
- **Uploaded to accounting software** boolean toggle per document
- Documents are **fully editable** after creation
- Long press to delete documents

### 2. Client Management ✅
- Add new clients via FAB button
- **Edit existing clients** via dedicated edit button on client cards & detail page
- Long press to delete clients (cascades to documents/tasks)
- Search clients by name, owner, or mobile

### 3. Task Management System ✅
- Daily task entry with description
- Task completion toggle
- "All documents submitted" checkbox per task
- Long press to delete tasks
- Separate views for Pending and Completed tasks

### 4. AI-Powered Features (OpenAI GPT-4o via Emergent LLM Key) ✅
- **Generate Personalized Client Message**: AI creates polite WhatsApp messages about pending documents - **plain text format for direct copy-paste**
- **Generate Document Cheatsheet**: AI creates organized document summary - **plain text format**
- **Generate Daily Summary**: AI generates executive summary report - **plain text format suitable for WhatsApp sharing**
- All AI outputs are PLAIN TEXT (no markdown formatting)

### 5. Notifications & Reminders ✅
- Push notification permission request on app start
- Morning startup reminder for pending tasks
- Long pending alerts on dashboard (>7 days)

### 6. Dashboard ✅
- Real-time statistics
- Color-coded metric cards
- Alerts for urgent items
- Quick navigation to all sections

### 7. Branding ✅
- **Raj & Co. logo** integrated as app icon
- Logo displayed in all headers (main tabs and client detail)
- Splash screen with logo
- Professional blue (#1e3a8a) color scheme

## Technical Stack
- **Backend**: FastAPI + MongoDB + Emergent LLM (GPT-4o)
- **Frontend**: Expo SDK 54 (React Native) + TypeScript + Expo Router
- **Storage**: MongoDB with UUID-based IDs

## API Endpoints
- `GET/POST/PUT/DELETE /api/clients` - Client CRUD
- `GET/POST/PUT/DELETE /api/documents` - Document CRUD with new fields
- `GET/POST/PUT/DELETE /api/tasks` - Task CRUD
- `GET /api/dashboard/stats` - Statistics
- `POST /api/ai/generate-message` - AI client message (plain text)
- `POST /api/ai/generate-cheatsheet` - AI cheatsheet (plain text)
- `POST /api/ai/daily-summary` - AI daily summary (plain text)

## Data Models

### Document (Updated)
```
{
  doc_name: string,
  status: "pending" | "submitted",
  storage_location: string,
  softcopy_location: string,
  return_status: boolean,
  last_entry_date: string (YYYY-MM-DD),  // Renamed from deadline_date
  uploaded_to_accounting: boolean         // NEW FIELD
}
```

### Client
```
{
  firm_name: string,
  owner_name: string,
  mobile: string,
  email: string,
  address: string
}
```

## Recent Updates
- Renamed `deadline_date` to `last_entry_date`
- Added `uploaded_to_accounting` boolean field
- Added native date picker for last entry date
- Made all documents and clients fully editable
- Changed AI outputs to plain text (no markdown)
- Fixed AI message generation (now non-streaming)
- Removed "required" status (only pending/submitted now)
- Integrated Raj & Co. logo throughout the app
