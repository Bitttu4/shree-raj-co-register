import * as SQLite from 'expo-sqlite';
import { ClientRecord, DocumentRecord, TaskRecord, makeId, toFlag } from './local-db.shared';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initDb() {
  const db = await SQLite.openDatabaseAsync('shree_raj_local.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY NOT NULL,
      firm_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      client_id TEXT NOT NULL,
      doc_name TEXT NOT NULL,
      status TEXT NOT NULL,
      storage_location TEXT,
      softcopy_location TEXT,
      return_status INTEGER NOT NULL DEFAULT 0,
      last_entry_date TEXT,
      uploaded_to_accounting INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      client_id TEXT,
      task_name TEXT NOT NULL,
      description TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      all_docs_submitted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);
  return db;
}

export async function getDb() {
  if (!dbPromise) dbPromise = initDb();
  return dbPromise;
}

export async function listClients() {
  const db = await getDb();
  return db.getAllAsync<ClientRecord>('SELECT * FROM clients ORDER BY created_at DESC');
}
export async function getClient(id: string) {
  const db = await getDb();
  return db.getFirstAsync<ClientRecord>('SELECT * FROM clients WHERE id = ?', id);
}
export async function createClient(input: Omit<ClientRecord, 'id' | 'created_at'> & { id?: string }) {
  const db = await getDb();
  const client = { ...input, id: input.id ?? makeId(), created_at: new Date().toISOString() };
  await db.runAsync('INSERT INTO clients (id, firm_name, owner_name, mobile, email, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', client.id, client.firm_name, client.owner_name, client.mobile, client.email, client.address, client.created_at);
  return client;
}
export async function updateClient(id: string, patch: Partial<Omit<ClientRecord, 'id' | 'created_at'>>) {
  const db = await getDb();
  const current = await getClient(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await db.runAsync('UPDATE clients SET firm_name = ?, owner_name = ?, mobile = ?, email = ?, address = ? WHERE id = ?', next.firm_name, next.owner_name, next.mobile, next.email, next.address, id);
  return next;
}
export async function deleteClient(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM documents WHERE client_id = ?', id);
  await db.runAsync('DELETE FROM tasks WHERE client_id = ?', id);
  return (await db.runAsync('DELETE FROM clients WHERE id = ?', id)).changes > 0;
}

export async function listDocuments(clientId?: string) {
  const db = await getDb();
  return clientId ? db.getAllAsync<DocumentRecord>('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC', clientId) : db.getAllAsync<DocumentRecord>('SELECT * FROM documents ORDER BY created_at DESC');
}
export async function getDocument(id: string) {
  const db = await getDb();
  return db.getFirstAsync<DocumentRecord>('SELECT * FROM documents WHERE id = ?', id);
}
export async function createDocument(input: Omit<DocumentRecord, 'id' | 'created_at' | 'return_status' | 'uploaded_to_accounting'> & Partial<Pick<DocumentRecord, 'return_status' | 'uploaded_to_accounting'>> & { id?: string }) {
  const db = await getDb();
  const doc: DocumentRecord = { ...input, id: input.id ?? makeId(), status: input.status ?? 'pending', return_status: toFlag(input.return_status), uploaded_to_accounting: toFlag(input.uploaded_to_accounting), created_at: new Date().toISOString() } as DocumentRecord;
  await db.runAsync('INSERT INTO documents (id, client_id, doc_name, status, storage_location, softcopy_location, return_status, last_entry_date, uploaded_to_accounting, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', doc.id, doc.client_id, doc.doc_name, doc.status, doc.storage_location, doc.softcopy_location, doc.return_status, doc.last_entry_date, doc.uploaded_to_accounting, doc.created_at);
  return doc;
}
export async function updateDocument(id: string, patch: Partial<Omit<DocumentRecord, 'id' | 'created_at'>>) {
  const db = await getDb();
  const current = await getDocument(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await db.runAsync('UPDATE documents SET doc_name = ?, status = ?, storage_location = ?, softcopy_location = ?, return_status = ?, last_entry_date = ?, uploaded_to_accounting = ? WHERE id = ?', next.doc_name, next.status, next.storage_location, next.softcopy_location, toFlag(next.return_status), next.last_entry_date, toFlag(next.uploaded_to_accounting), id);
  return { ...next, return_status: toFlag(next.return_status), uploaded_to_accounting: toFlag(next.uploaded_to_accounting) };
}
export async function deleteDocument(id: string) {
  const db = await getDb();
  return (await db.runAsync('DELETE FROM documents WHERE id = ?', id)).changes > 0;
}

export async function listTasks() {
  const db = await getDb();
  return db.getAllAsync<TaskRecord>('SELECT * FROM tasks ORDER BY created_at DESC');
}
export async function listPendingTasks() {
  const db = await getDb();
  return db.getAllAsync<TaskRecord>('SELECT * FROM tasks WHERE is_completed = 0 ORDER BY created_at DESC');
}
export async function getTask(id: string) {
  const db = await getDb();
  return db.getFirstAsync<TaskRecord>('SELECT * FROM tasks WHERE id = ?', id);
}
export async function createTask(input: Omit<TaskRecord, 'id' | 'created_at' | 'is_completed' | 'completed_at'> & Partial<Pick<TaskRecord, 'is_completed' | 'completed_at'>> & { id?: string }) {
  const db = await getDb();
  const task: TaskRecord = { ...input, id: input.id ?? makeId(), is_completed: toFlag(input.is_completed), completed_at: input.completed_at ?? null, created_at: new Date().toISOString() } as TaskRecord;
  await db.runAsync('INSERT INTO tasks (id, client_id, task_name, description, is_completed, all_docs_submitted, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', task.id, task.client_id, task.task_name, task.description, task.is_completed, task.all_docs_submitted, task.created_at, task.completed_at);
  return task;
}
export async function updateTask(id: string, patch: Partial<Omit<TaskRecord, 'id' | 'created_at'>>) {
  const db = await getDb();
  const current = await getTask(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await db.runAsync('UPDATE tasks SET task_name = ?, description = ?, is_completed = ?, all_docs_submitted = ?, completed_at = ? WHERE id = ?', next.task_name, next.description, toFlag(next.is_completed), toFlag(next.all_docs_submitted), next.completed_at, id);
  return { ...next, is_completed: toFlag(next.is_completed), all_docs_submitted: toFlag(next.all_docs_submitted) };
}
export async function deleteTask(id: string) {
  const db = await getDb();
  return (await db.runAsync('DELETE FROM tasks WHERE id = ?', id)).changes > 0;
}

export async function getDashboardStats() {
  const db = await getDb();
  const clients = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM clients');
  const tasks = await db.getFirstAsync<{ total: number; pending: number; completed: number }>('SELECT COUNT(*) AS total, SUM(CASE WHEN is_completed = 0 THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS completed FROM tasks');
  const documents = await db.getFirstAsync<{ total: number; pending: number; submitted: number }>('SELECT COUNT(*) AS total, SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status = "submitted" THEN 1 ELSE 0 END) AS submitted FROM documents');
  return { clients: { total: clients?.total ?? 0 }, tasks: { total: tasks?.total ?? 0, pending: tasks?.pending ?? 0, completed: tasks?.completed ?? 0, long_pending: 0 }, documents: { total: documents?.total ?? 0, pending: documents?.pending ?? 0, submitted: documents?.submitted ?? 0 } };
}
