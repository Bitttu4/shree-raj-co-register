import { ClientRecord, DocumentRecord, TaskRecord, makeId, toFlag } from './local-db.shared';

type StoreShape = {
  clients: ClientRecord[];
  documents: DocumentRecord[];
  tasks: TaskRecord[];
};

const KEY = 'shree_raj_local_store_v1';

const blankStore = (): StoreShape => ({ clients: [], documents: [], tasks: [] });

const loadStore = (): StoreShape => {
  if (typeof window === 'undefined') return blankStore();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return blankStore();
  try {
    return JSON.parse(raw) as StoreShape;
  } catch {
    return blankStore();
  }
};

const saveStore = (store: StoreShape) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
};

const clone = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T;

export async function listClients() { return clone(loadStore().clients.sort((a, b) => b.created_at.localeCompare(a.created_at))); }
export async function getClient(id: string) { return clone(loadStore().clients.find((c) => c.id === id) ?? null); }
export async function createClient(input: Omit<ClientRecord, 'id' | 'created_at'> & { id?: string }) {
  const store = loadStore();
  const client = { ...input, id: input.id ?? makeId(), created_at: new Date().toISOString() };
  store.clients.push(client);
  saveStore(store);
  return client;
}
export async function updateClient(id: string, patch: Partial<Omit<ClientRecord, 'id' | 'created_at'>>) {
  const store = loadStore();
  const idx = store.clients.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  store.clients[idx] = { ...store.clients[idx], ...patch };
  saveStore(store);
  return clone(store.clients[idx]);
}
export async function deleteClient(id: string) {
  const store = loadStore();
  store.clients = store.clients.filter((c) => c.id !== id);
  store.documents = store.documents.filter((d) => d.client_id !== id);
  store.tasks = store.tasks.filter((t) => t.client_id !== id);
  saveStore(store);
  return true;
}

export async function listDocuments(clientId?: string) {
  const docs = loadStore().documents;
  const result = clientId ? docs.filter((d) => d.client_id === clientId) : docs;
  return clone(result.sort((a, b) => b.created_at.localeCompare(a.created_at)));
}
export async function getDocument(id: string) { return clone(loadStore().documents.find((d) => d.id === id) ?? null); }
export async function createDocument(input: Omit<DocumentRecord, 'id' | 'created_at' | 'return_status' | 'uploaded_to_accounting'> & Partial<Pick<DocumentRecord, 'return_status' | 'uploaded_to_accounting'>> & { id?: string }) {
  const store = loadStore();
  const doc: DocumentRecord = { ...input, id: input.id ?? makeId(), status: input.status ?? 'pending', return_status: toFlag(input.return_status), uploaded_to_accounting: toFlag(input.uploaded_to_accounting), created_at: new Date().toISOString() } as DocumentRecord;
  store.documents.push(doc);
  saveStore(store);
  return doc;
}
export async function updateDocument(id: string, patch: Partial<Omit<DocumentRecord, 'id' | 'created_at'>>) {
  const store = loadStore();
  const idx = store.documents.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  store.documents[idx] = { ...store.documents[idx], ...patch };
  saveStore(store);
  return clone(store.documents[idx]);
}
export async function deleteDocument(id: string) {
  const store = loadStore();
  store.documents = store.documents.filter((d) => d.id !== id);
  saveStore(store);
  return true;
}

export async function listTasks() { return clone(loadStore().tasks.sort((a, b) => b.created_at.localeCompare(a.created_at))); }
export async function listPendingTasks() { return clone(loadStore().tasks.filter((t) => !t.is_completed)); }
export async function getTask(id: string) { return clone(loadStore().tasks.find((t) => t.id === id) ?? null); }
export async function createTask(input: Omit<TaskRecord, 'id' | 'created_at' | 'is_completed' | 'completed_at'> & Partial<Pick<TaskRecord, 'is_completed' | 'completed_at'>> & { id?: string }) {
  const store = loadStore();
  const task: TaskRecord = { ...input, id: input.id ?? makeId(), is_completed: toFlag(input.is_completed), completed_at: input.completed_at ?? null, created_at: new Date().toISOString() } as TaskRecord;
  store.tasks.push(task);
  saveStore(store);
  return task;
}
export async function updateTask(id: string, patch: Partial<Omit<TaskRecord, 'id' | 'created_at'>>) {
  const store = loadStore();
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  store.tasks[idx] = { ...store.tasks[idx], ...patch };
  saveStore(store);
  return clone(store.tasks[idx]);
}
export async function deleteTask(id: string) {
  const store = loadStore();
  store.tasks = store.tasks.filter((t) => t.id !== id);
  saveStore(store);
  return true;
}

export async function getDashboardStats() {
  const store = loadStore();
  return {
    clients: { total: store.clients.length },
    tasks: {
      total: store.tasks.length,
      pending: store.tasks.filter((t) => !t.is_completed).length,
      completed: store.tasks.filter((t) => t.is_completed).length,
      long_pending: 0,
    },
    documents: {
      total: store.documents.length,
      pending: store.documents.filter((d) => d.status === 'pending').length,
      submitted: store.documents.filter((d) => d.status === 'submitted').length,
    },
  };
}
