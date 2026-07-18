export type ClientRecord = {
  id: string;
  firm_name: string;
  owner_name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  created_at: string;
};

export type DocumentRecord = {
  id: string;
  client_id: string;
  doc_name: string;
  status: 'submitted' | 'pending';
  storage_location: string | null;
  softcopy_location: string | null;
  return_status: 0 | 1;
  last_entry_date: string | null;
  uploaded_to_accounting: 0 | 1;
  created_at: string;
};

export type TaskRecord = {
  id: string;
  client_id: string | null;
  task_name: string;
  description: string | null;
  is_completed: 0 | 1;
  all_docs_submitted: 0 | 1;
  created_at: string;
  completed_at: string | null;
};

export const toFlag = (value: unknown) => (value ? 1 : 0) as 0 | 1;
export const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
