# Development Commands and Folder Guide

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm start
```

### Android

```bash
cd frontend
npm run android
```

### iOS

```bash
cd frontend
npm run ios
```

### Web

```bash
cd frontend
npm run web
```

### Type Check

```bash
cd frontend
npx tsc --noEmit
```

### Lint

```bash
cd frontend
npm run lint
```

## Useful Expo Commands

```bash
npx expo start --clear
npx expo install expo-sqlite expo-file-system
npx expo doctor
```

## Project Structure

### `frontend/`

- `app/`
- `assets/`
- `constants/`
- `scripts/`
- `src/`
- `app.json`
- `package.json`
- `tsconfig.json`

### `frontend/app/`

- `_layout.tsx`: root navigation
- `index.tsx`: redirects to tabs
- `client-detail.tsx`: detailed client workspace
- `(tabs)/`: tab-based screens

### `frontend/app/(tabs)/`

- `index.tsx`: dashboard
- `clients.tsx`: client directory
- `tasks.tsx`: task board
- `summary.tsx`: summary view

### `frontend/src/lib/`

- `local-db.ts`: SQLite database access layer
- `local-import.ts`: CSV parsing and bulk import helpers

### `frontend/src/hooks/`

- `use-icon-fonts.ts`: icon font loading helper

### `frontend/scripts/`

- `check-pkg.js`: package manager guard
- `install-guard.sh`: install helper
- `reset-project.js`: reset starter state

### `backend/`

This folder is now legacy and not required for the current local-only app runtime.

## Local Database Notes

- Database file: `shree_raj_local.db`
- Storage is device-local through `expo-sqlite`
- Each device keeps its own records

## Development Flow

1. Make UI or data-layer changes in `frontend/`
2. Run `npx tsc --noEmit`
3. Run `npm run lint`
4. Start the app with `npm start`
5. Test on a real device or emulator

## Recommended Editing Order

1. `frontend/src/lib/local-db.ts`
2. `frontend/src/lib/local-import.ts`
3. `frontend/app/(tabs)/index.tsx`
4. `frontend/app/(tabs)/clients.tsx`
5. `frontend/app/(tabs)/tasks.tsx`
6. `frontend/app/(tabs)/summary.tsx`
7. `frontend/app/client-detail.tsx`

## Package Notes

Frontend dependencies now include:

- `expo-sqlite`
- `expo-file-system`
- `expo-document-picker`
- Expo Router and React Native UI packages

## Example Troubleshooting Commands

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npx expo start --clear
```
