import { createClient, createDocument } from './local-db';

function parseCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim();
    });
    return row;
  });
}

export async function importClientsFromCsv(csv: string) {
  const rows = parseCsv(csv);
  const created: string[] = [];
  const errors: string[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row.firm_name || !row.owner_name || !row.mobile) {
      errors.push(`Row ${index + 2}: Missing required fields`);
      continue;
    }
    try {
      const client = await createClient({
        firm_name: row.firm_name,
        owner_name: row.owner_name,
        mobile: row.mobile,
        email: row.email || null,
        address: row.address || null,
      });
      created.push(client.firm_name);
    } catch (error) {
      errors.push(`Row ${index + 2}: ${(error as Error).message}`);
    }
  }
  return { success: true, created_count: created.length, created, errors };
}

export async function importDocumentsFromCsv(clientId: string, csv: string) {
  const rows = parseCsv(csv);
  const created: string[] = [];
  const errors: string[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const docName = row.doc_name || row['doc name'] || row.document_name;
    if (!docName) {
      errors.push(`Row ${index + 2}: Missing doc_name`);
      continue;
    }
    try {
      const status = row.status === 'submitted' ? 'submitted' : 'pending';
      const uploaded = ['true', 'yes', '1', 'y'].includes((row.uploaded_to_accounting || row.uploaded || '').toLowerCase());
      const document = await createDocument({
        client_id: clientId,
        doc_name: docName,
        status,
        storage_location: row.storage_location || null,
        softcopy_location: row.softcopy_location || null,
        return_status: 0,
        last_entry_date: row.last_entry_date || null,
        uploaded_to_accounting: uploaded ? 1 : 0,
      });
      created.push(document.doc_name);
    } catch (error) {
      errors.push(`Row ${index + 2}: ${(error as Error).message}`);
    }
  }
  return { success: true, created_count: created.length, created, errors };
}
