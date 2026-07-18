import { Platform } from 'react-native';
import type { ClientRecord, DocumentRecord, TaskRecord } from './local-db.shared';

type Impl = typeof import('./local-db.native') | typeof import('./local-db.web');

let implPromise: Promise<Impl> | null = null;

function loadImpl() {
  if (!implPromise) {
    implPromise = Platform.OS === 'web'
      ? import('./local-db.web')
      : import('./local-db.native');
  }
  return implPromise;
}

export type { ClientRecord, DocumentRecord, TaskRecord } from './local-db.shared';

export async function listClients() { return (await loadImpl()).listClients(); }
export async function getClient(id: string) { return (await loadImpl()).getClient(id); }
export async function createClient(input: Parameters<Impl['createClient']>[0]) { return (await loadImpl()).createClient(input as any); }
export async function updateClient(id: string, patch: Parameters<Impl['updateClient']>[1]) { return (await loadImpl()).updateClient(id, patch as any); }
export async function deleteClient(id: string) { return (await loadImpl()).deleteClient(id); }

export async function listDocuments(clientId?: string) { return (await loadImpl()).listDocuments(clientId); }
export async function getDocument(id: string) { return (await loadImpl()).getDocument(id); }
export async function createDocument(input: Parameters<Impl['createDocument']>[0]) { return (await loadImpl()).createDocument(input as any); }
export async function updateDocument(id: string, patch: Parameters<Impl['updateDocument']>[1]) { return (await loadImpl()).updateDocument(id, patch as any); }
export async function deleteDocument(id: string) { return (await loadImpl()).deleteDocument(id); }

export async function listTasks() { return (await loadImpl()).listTasks(); }
export async function listPendingTasks() { return (await loadImpl()).listPendingTasks(); }
export async function getTask(id: string) { return (await loadImpl()).getTask(id); }
export async function createTask(input: Parameters<Impl['createTask']>[0]) { return (await loadImpl()).createTask(input as any); }
export async function updateTask(id: string, patch: Parameters<Impl['updateTask']>[1]) { return (await loadImpl()).updateTask(id, patch as any); }
export async function deleteTask(id: string) { return (await loadImpl()).deleteTask(id); }

export async function getDashboardStats() { return (await loadImpl()).getDashboardStats(); }
