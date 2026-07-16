# SHREE RAJ & CO Register Management System Architecture Report

## 1. Purpose

This project is a register-management application for a CA/accounting workflow. It helps manage:

- Clients
- Client documents
- Tasks
- Dashboard summary counts
- Bulk CSV imports
- AI-related helper actions that are currently stubbed out

The repository currently uses a classic client-server architecture:

- A mobile/web frontend built with Expo Router and React Native
- A backend API built with FastAPI
- MongoDB as the persistence layer

The report below explains the current codebase so a new developer can understand how the application is organized and how data moves through it.

## 2. High-Level System View

Current request flow:

```text
Frontend (Expo Router / React Native)
  -> REST API requests
Backend (FastAPI)
  -> MongoDB collections
```

The frontend does not keep the primary business data locally. Instead, it calls the backend API for client, document, and task operations.

## 3. Repository Structure

Top-level layout:

- [`backend/`](./backend)
- [`frontend/`](./frontend)
- [`memory/`](./memory)
- [`tests/`](./tests)
- [`test_reports/`](./test_reports)
- [`backend_test.py`](./backend_test.py)
- [`project_overview.md`](./project_overview.md)
- [`README.md`](./README.md)

### What each major folder is for

- `backend/`: FastAPI service, database models, and backend tests
- `frontend/`: Expo app with screens, navigation, styling, and client-side API calls
- `memory/`: project notes and product requirements
- `tests/` and `test_reports/`: test scaffolding and generated test output
- `backend_test.py`: an end-to-end API test runner script

## 4. Frontend Architecture

The frontend is an Expo Router application using React Native and TypeScript.

### Core frontend stack

- Expo SDK 56
- React Native
- TypeScript
- Expo Router
- Native UI components
- `expo-document-picker` for CSV import
- `@react-native-community/datetimepicker` for date selection
- `expo-splash-screen` for startup handling

### Frontend entry flow

The app starts in:

- [`frontend/app/_layout.tsx`](./frontend/app/_layout.tsx)

Then redirects into the tab navigator:

- [`frontend/app/index.tsx`](./frontend/app/index.tsx)

### Root layout

[`frontend/app/_layout.tsx`](./frontend/app/_layout.tsx) does three main things:

- Prevents the splash screen from auto-hiding
- Waits briefly before rendering the app
- Wraps the app in `SafeAreaProvider`

It defines two top-level routes:

- `(tabs)`
- `client-detail`

### Tab navigation

[`frontend/app/(tabs)/_layout.tsx`](./frontend/app/(tabs)/_layout.tsx) defines the tab-based UI structure.

The main screens under the tab group are:

- [`frontend/app/(tabs)/index.tsx`](./frontend/app/(tabs)/index.tsx)
- [`frontend/app/(tabs)/clients.tsx`](./frontend/app/(tabs)/clients.tsx)
- [`frontend/app/(tabs)/tasks.tsx`](./frontend/app/(tabs)/tasks.tsx)
- [`frontend/app/(tabs)/summary.tsx`](./frontend/app/(tabs)/summary.tsx)

### Main frontend screens

#### 4.1 Dashboard screen

[`frontend/app/(tabs)/index.tsx`](./frontend/app/(tabs)/index.tsx) is the landing dashboard.

Typical responsibilities for this screen:

- Fetch dashboard statistics from the backend
- Show counts for clients, tasks, and documents
- Give a quick operational overview

#### 4.2 Clients screen

[`frontend/app/(tabs)/clients.tsx`](./frontend/app/(tabs)/clients.tsx) is the client management area.

This screen is responsible for:

- Listing clients
- Searching or filtering clients if implemented in the UI
- Opening client details
- Creating, editing, or deleting clients

#### 4.3 Tasks screen

[`frontend/app/(tabs)/tasks.tsx`](./frontend/app/(tabs)/tasks.tsx) manages task operations.

This screen usually handles:

- Listing tasks
- Showing pending vs completed work
- Creating new tasks
- Marking tasks complete
- Removing tasks

#### 4.4 Summary screen

[`frontend/app/(tabs)/summary.tsx`](./frontend/app/(tabs)/summary.tsx) is the summary/reporting view.

This typically combines dashboard-style data into a more digestible overview for the user.

### Client detail screen

[`frontend/app/client-detail.tsx`](./frontend/app/client-detail.tsx) is the most feature-rich frontend screen in the repository.

It handles:

- Fetching a single client
- Fetching that client’s documents
- Creating a document
- Updating a document
- Deleting a document
- Toggling document status
- Toggling return status
- Toggling accounting upload status
- Editing client details
- Bulk importing documents from CSV
- Generating AI-style client messages
- Generating document cheatsheets
- Sharing generated content

### Frontend data flow

The frontend uses `fetch()` calls to talk to the backend. The base API URL is read from:

- `EXPO_PUBLIC_BACKEND_URL`

That means the frontend is environment-driven and can point to different backend deployments without code changes.

### Frontend state management

The code uses React state hooks directly:

- `useState`
- `useEffect`

There is no global Redux-style store in the current codebase. Each screen owns its own state and refresh logic.

### Frontend UX patterns

The frontend relies on:

- Modal dialogs for create/edit actions
- Native action sheets or alerts for destructive confirmation
- Pull-to-refresh on list/detail screens
- Local loading indicators
- Sharing support for generated text

## 5. Backend Architecture

The backend is a FastAPI application built around REST endpoints and MongoDB collections.

### Core backend stack

- FastAPI
- Motor async MongoDB driver
- Pydantic models
- CORS middleware
- Python dotenv loading
- UUID-based record IDs

### Backend entry point

The main application is:

- [`backend/server.py`](./backend/server.py)

This file contains:

- App initialization
- Environment loading
- Mongo connection setup
- Pydantic models
- REST route definitions
- CORS configuration
- Shutdown cleanup

### Backend startup behavior

At startup the backend:

- Loads environment variables from `backend/.env`
- Reads `MONGO_URL`
- Reads `DB_NAME`
- Opens an async MongoDB client
- Creates a FastAPI app
- Registers the API router under `/api`

### Backend data model layer

The backend uses Pydantic models for request and response validation.

#### Client models

- `Client`
- `ClientCreate`
- `ClientUpdate`

Fields include:

- `id`
- `firm_name`
- `owner_name`
- `mobile`
- `email`
- `address`
- `created_at`

#### Document models

- `Document`
- `DocumentCreate`
- `DocumentUpdate`

Fields include:

- `id`
- `client_id`
- `doc_name`
- `status`
- `storage_location`
- `softcopy_location`
- `return_status`
- `last_entry_date`
- `uploaded_to_accounting`
- `created_at`

#### Task models

- `Task`
- `TaskCreate`
- `TaskUpdate`

Fields include:

- `id`
- `client_id`
- `task_name`
- `description`
- `is_completed`
- `all_docs_submitted`
- `created_at`
- `completed_at`

### MongoDB collections

The application persists data in these collections:

- `users`
- `clients`
- `documents`
- `tasks`

The current code directly references:

- `db.clients`
- `db.documents`
- `db.tasks`

The `users` collection is noted in the project overview, but the current backend file does not expose active auth routes in the same way as clients/documents/tasks.

## 6. Backend API Surface

All routes are mounted under `/api`.

### Clients

- `POST /api/clients`
- `GET /api/clients`
- `GET /api/clients/{client_id}`
- `PUT /api/clients/{client_id}`
- `DELETE /api/clients/{client_id}`

Behavior notes:

- Client IDs are UUID strings generated in the model
- Deleting a client also deletes related documents and tasks

### Documents

- `POST /api/documents`
- `GET /api/documents`
- `GET /api/documents/client/{client_id}`
- `GET /api/documents/{doc_id}`
- `PUT /api/documents/{doc_id}`
- `DELETE /api/documents/{doc_id}`

Behavior notes:

- Documents belong to a client through `client_id`
- Document status supports `pending` and `submitted`
- Additional workflow flags include `return_status` and `uploaded_to_accounting`
- The model tracks a `last_entry_date` field for accounting context

### Tasks

- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/tasks/pending`
- `GET /api/tasks/{task_id}`
- `PUT /api/tasks/{task_id}`
- `DELETE /api/tasks/{task_id}`

Behavior notes:

- Tasks can be client-linked or general
- When a task is marked complete, `completed_at` is automatically set

### Bulk import

- `POST /api/bulk/clients`
- `POST /api/bulk/documents`

These endpoints accept CSV text inside JSON and import multiple records in one call.

#### Bulk client import

Expected CSV columns:

- `firm_name`
- `owner_name`
- `mobile`
- `email`
- `address`

The implementation is tolerant of header casing variations such as `Firm Name` or `Owner Name`.

#### Bulk document import

Expected CSV columns:

- `doc_name`
- `status`
- `storage_location`
- `softcopy_location`
- `last_entry_date`
- `uploaded_to_accounting`

The import validates that the referenced client exists before inserting documents.

### AI helper endpoints

- `POST /api/ai/generate-message`
- `POST /api/ai/generate-cheatsheet`
- `POST /api/ai/daily-summary`

Current behavior:

- These endpoints return placeholder content
- The code indicates AI integration is temporarily disabled

### Dashboard stats

- `GET /api/dashboard/stats`

This endpoint returns counts for:

- Total clients
- Total tasks
- Pending tasks
- Completed tasks
- Long-pending tasks
- Total documents
- Pending documents
- Submitted documents

## 7. How Frontend and Backend Connect

The integration is straightforward:

1. The frontend screen is mounted
2. It reads `EXPO_PUBLIC_BACKEND_URL`
3. It calls a backend endpoint with `fetch()`
4. The backend validates the request using Pydantic models
5. The backend reads or writes MongoDB
6. The backend returns JSON
7. The frontend updates local state and re-renders

Example:

- `frontend/app/client-detail.tsx` loads a client by calling:
  - `GET /api/clients/{id}`
  - `GET /api/documents/client/{id}`

## 8. Testing Structure

### Backend tests in `backend/tests/`

There are two test files:

- [`backend/tests/test_ca_firm_backend.py`](./backend/tests/test_ca_firm_backend.py)
- [`backend/tests/test_auth_and_bulk.py`](./backend/tests/test_auth_and_bulk.py)

These tests cover:

- Client CRUD
- Document CRUD
- Task CRUD
- Dashboard stats
- Bulk CSV import
- AI helper endpoints

### Standalone API runner

- [`backend_test.py`](./backend_test.py)

This is a larger end-to-end script that exercises:

- Create/list/update/delete flows
- Dashboard stats
- AI endpoints
- Cleanup logic

## 9. Important File-by-File Guide

### Root files

- [`README.md`](./README.md): short high-level project summary
- [`project_overview.md`](./project_overview.md): brief architecture and product direction note
- [`backend_test.py`](./backend_test.py): manual API test runner
- [`test_result.md`](./test_result.md): output from previous test runs

### Backend files

- [`backend/server.py`](./backend/server.py): main API server
- [`backend/requirements.txt`](./backend/requirements.txt): Python dependencies
- [`backend/tests/test_ca_firm_backend.py`](./backend/tests/test_ca_firm_backend.py): core API tests
- [`backend/tests/test_auth_and_bulk.py`](./backend/tests/test_auth_and_bulk.py): bulk import and compatibility tests

### Frontend files

- [`frontend/package.json`](./frontend/package.json): Expo app dependencies and scripts
- [`frontend/app/_layout.tsx`](./frontend/app/_layout.tsx): root navigation layout
- [`frontend/app/index.tsx`](./frontend/app/index.tsx): redirects to tabs
- [`frontend/app/client-detail.tsx`](./frontend/app/client-detail.tsx): client detail and document management screen
- [`frontend/app/(tabs)/_layout.tsx`](./frontend/app/(tabs)/_layout.tsx): tab navigator
- [`frontend/app/(tabs)/index.tsx`](./frontend/app/(tabs)/index.tsx): dashboard tab
- [`frontend/app/(tabs)/clients.tsx`](./frontend/app/(tabs)/clients.tsx): clients tab
- [`frontend/app/(tabs)/tasks.tsx`](./frontend/app/(tabs)/tasks.tsx): tasks tab
- [`frontend/app/(tabs)/summary.tsx`](./frontend/app/(tabs)/summary.tsx): summary tab

## 10. Current Architectural Characteristics

### Strengths

- Clear separation between UI and API
- Strong use of typed models on the backend
- CRUD structure is easy to understand
- Client detail screen already consolidates many business workflows
- Bulk CSV import support is built in
- Test coverage exists for major API areas

### Constraints

- Backend is required for all core data operations
- MongoDB is the source of truth
- Auth-related concepts exist in the project description, but the active backend code is largely focused on data management rather than login enforcement
- AI endpoints are placeholders instead of full integrations

## 11. How a New Developer Should Read the Project

Recommended reading order:

1. [`project_overview.md`](./project_overview.md)
2. [`backend/server.py`](./backend/server.py)
3. [`frontend/app/_layout.tsx`](./frontend/app/_layout.tsx)
4. [`frontend/app/(tabs)/index.tsx`](./frontend/app/(tabs)/index.tsx)
5. [`frontend/app/client-detail.tsx`](./frontend/app/client-detail.tsx)
6. [`backend/tests/test_ca_firm_backend.py`](./backend/tests/test_ca_firm_backend.py)
7. [`backend/tests/test_auth_and_bulk.py`](./backend/tests/test_auth_and_bulk.py)

That order gives the fastest path from product overview to navigation, then API behavior, then validation tests.

## 12. Notes for Future Migration

The repository notes say the long-term goal is to move toward:

- Single-user app
- Completely offline
- No backend
- No MongoDB
- No login/signup
- Local data only
- `expo-sqlite`

That goal is not what the current code implements. The current implementation is still a connected client-server app.

If the project is migrated later, the frontend will likely keep much of its UI, but the data layer will need to be replaced from REST + MongoDB to local persistence.

## 13. Summary

This project is a structured client-management system for a CA firm.

At present, the architecture is:

- Expo Router frontend for mobile/web UI
- FastAPI backend for business logic and data access
- MongoDB for persistence
- REST API communication between frontend and backend

The main business objects are:

- Clients
- Documents
- Tasks

The most important user experience lives in the client detail screen, which combines document tracking, client editing, CSV import, and helper actions in one place.
