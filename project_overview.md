# SHREE RAJ & CO Register Management System

## Current Architecture

The app is now local-first:

`Frontend -> expo-sqlite -> device-local storage`

## Frontend

- Expo SDK 56
- React Native
- TypeScript
- Expo Router
- Local SQLite database

## Features

- Dashboard
- Client management
- Document management
- Task management
- CSV import

## Data Storage

Each device stores its own data locally in SQLite.

Local tables:

- clients
- documents
- tasks

## Goal

Keep the app fully offline and device-local while preserving the existing UI and features.
