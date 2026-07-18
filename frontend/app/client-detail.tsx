import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { createDocument, deleteClient, deleteDocument, getClient, listDocuments, updateClient, updateDocument } from '../src/lib/local-db';
import { importDocumentsFromCsv } from '../src/lib/local-import';

const blankDoc = { doc_name: '', status: 'pending', storage_location: '', softcopy_location: '', last_entry_date: '' };

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [docVisible, setDocVisible] = useState(false);
  const [clientVisible, setClientVisible] = useState(false);
  const [csvVisible, setCsvVisible] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [docForm, setDocForm] = useState(blankDoc);
  const [clientForm, setClientForm] = useState({ firm_name: '', owner_name: '', mobile: '', email: '', address: '' });

  const load = async () => {
    if (!id) return;
    const [clientData, docsData] = await Promise.all([getClient(id), listDocuments(id)]);
    setClient(clientData);
    setDocuments(docsData);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [id]);

  const stats = useMemo(() => ({
    pending: documents.filter((doc) => doc.status === 'pending').length,
    submitted: documents.filter((doc) => doc.status === 'submitted').length,
  }), [documents]);

  const goBack = () => {
    if (Platform.OS === 'web') {
      router.replace('/(tabs)');
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  if (!client) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Client not found</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={goBack}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const openNewDoc = () => {
    setEditingDoc(null);
    setDocForm(blankDoc);
    setDocVisible(true);
  };

  const openEditDoc = (doc: any) => {
    setEditingDoc(doc);
    setDocForm({
      doc_name: doc.doc_name || '',
      status: doc.status || 'pending',
      storage_location: doc.storage_location || '',
      softcopy_location: doc.softcopy_location || '',
      last_entry_date: doc.last_entry_date || '',
    });
    setDocVisible(true);
  };

  const saveDoc = async () => {
    if (!docForm.doc_name) {
      Alert.alert('Missing fields', 'Document name is required.');
      return;
    }
    if (editingDoc) {
      await updateDocument(editingDoc.id, { ...docForm } as any);
    } else {
      await createDocument({ client_id: id, ...docForm, return_status: 0, uploaded_to_accounting: 0 } as any);
    }
    setDocVisible(false);
    load();
  };

  const saveClient = async () => {
    if (!clientForm.firm_name || !clientForm.owner_name || !clientForm.mobile) {
      Alert.alert('Missing fields', 'Please fill in the required client details.');
      return;
    }
    await updateClient(id, clientForm);
    setClientVisible(false);
    load();
  };

  const openClientEdit = () => {
    setClientForm({
      firm_name: client.firm_name || '',
      owner_name: client.owner_name || '',
      mobile: client.mobile || '',
      email: client.email || '',
      address: client.address || '',
    });
    setClientVisible(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.back}>Back</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.kicker}>Client profile</Text>
        <Text style={styles.title}>{client.firm_name}</Text>
        <Text style={styles.subtitle}>{client.owner_name} • {client.mobile}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <TouchableOpacity style={styles.ghostButton} onPress={openClientEdit}>
            <Text style={styles.ghostButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <InfoRow label="Firm" value={client.firm_name} />
        <InfoRow label="Owner" value={client.owner_name} />
        <InfoRow label="Mobile" value={client.mobile} />
        {client.email ? <InfoRow label="Email" value={client.email} /> : null}
        {client.address ? <InfoRow label="Address" value={client.address} /> : null}
      </View>

      <View style={styles.statsRow}>
        <Stat label="Pending" value={stats.pending} tone="amber" />
        <Stat label="Submitted" value={stats.submitted} tone="green" />
        <Stat label="Total" value={documents.length} tone="blue" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Documents</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={openNewDoc}>
            <Text style={styles.primaryButtonText}>Add Document</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setCsvVisible(true)}>
            <Text style={styles.secondaryButtonText}>Bulk CSV</Text>
          </TouchableOpacity>
        </View>

        {documents.length === 0 ? (
          <Text style={styles.empty}>No documents added yet.</Text>
        ) : (
          documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => openEditDoc(doc)}
              onLongPress={() => {
                Alert.alert('Delete document?', doc.doc_name, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDocument(doc.id); load(); } },
                ]);
              }}
            >
              <View style={styles.docTop}>
                <View style={[styles.statusDot, doc.status === 'submitted' ? styles.dotGreen : styles.dotAmber]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.docTitle}>{doc.doc_name}</Text>
                  <Text style={styles.docMeta}>
                    {doc.status === 'submitted' ? 'Submitted' : 'Pending'} • {doc.last_entry_date || 'No date'}
                  </Text>
                </View>
                <Text style={[styles.pill, doc.status === 'submitted' ? styles.pillGreen : styles.pillAmber]}>
                  {doc.status === 'submitted' ? 'Submitted' : 'Pending'}
                </Text>
              </View>

              <View style={styles.flagRow}>
                <View style={styles.flagItem}>
                  <Text style={styles.flagLabel}>File returned</Text>
                  <TouchableOpacity
                    style={[styles.flagButton, doc.return_status ? styles.flagButtonOn : styles.flagButtonOff]}
                    onPress={async () => {
                      await updateDocument(doc.id, { return_status: doc.return_status ? 0 : 1 } as any);
                      load();
                    }}
                  >
                    <Text style={styles.flagButtonText}>{doc.return_status ? 'Yes, returned' : 'Mark as returned'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.flagItem}>
                  <Text style={styles.flagLabel}>Uploaded to system</Text>
                  <TouchableOpacity
                    style={[styles.flagButton, doc.uploaded_to_accounting ? styles.flagButtonOn : styles.flagButtonOff]}
                    onPress={async () => {
                      await updateDocument(doc.id, { uploaded_to_accounting: doc.uploaded_to_accounting ? 0 : 1 } as any);
                      load();
                    }}
                  >
                    <Text style={styles.flagButtonText}>{doc.uploaded_to_accounting ? 'Yes, uploaded' : 'Mark as uploaded'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.docActions}>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={async () => {
                    await updateDocument(doc.id, { status: doc.status === 'pending' ? 'submitted' : 'pending' } as any);
                    load();
                  }}
                >
                  <Text style={styles.smallButtonText}>
                    {doc.status === 'pending' ? 'Mark as submitted' : 'Mark as pending'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallButton, styles.smallDanger]} onPress={async () => { await deleteDocument(doc.id); load(); }}>
                  <Text style={[styles.smallButtonText, styles.smallDangerText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity
        style={styles.dangerButton}
        onPress={() =>
          Alert.alert('Delete client?', 'This will remove the client and all linked data.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  const deleted = await deleteClient(id);
                  if (!deleted) {
                    Alert.alert('Delete failed', 'Client was not found in local storage.');
                    return;
                  }
                  router.replace('/(tabs)');
                } catch (error) {
                  Alert.alert('Delete failed', (error as Error).message);
                }
              },
            },
          ])
        }
      >
        <Text style={styles.dangerButtonText}>Delete Client</Text>
      </TouchableOpacity>

      <Modal visible={docVisible} transparent animationType="slide">
        <View style={styles.modal}><View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{editingDoc ? 'Edit Document' : 'New Document'}</Text>
          {(['doc_name', 'storage_location', 'softcopy_location', 'last_entry_date'] as const).map((key) => (
            <TextInput key={key} style={styles.input} placeholder={key.replace('_', ' ')} placeholderTextColor="#9ca3af" value={docForm[key]} onChangeText={(text) => setDocForm({ ...docForm, [key]: text })} />
          ))}
          <TouchableOpacity style={styles.primaryButton} onPress={saveDoc}><Text style={styles.primaryButtonText}>Save</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setDocVisible(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={clientVisible} transparent animationType="slide">
        <View style={styles.modal}><View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Edit Client</Text>
          {(['firm_name', 'owner_name', 'mobile', 'email', 'address'] as const).map((key) => (
            <TextInput key={key} style={styles.input} placeholder={key.replace('_', ' ')} placeholderTextColor="#9ca3af" value={clientForm[key]} onChangeText={(text) => setClientForm({ ...clientForm, [key]: text })} />
          ))}
          <TouchableOpacity style={styles.primaryButton} onPress={saveClient}><Text style={styles.primaryButtonText}>Save</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setClientVisible(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={csvVisible} transparent animationType="slide">
        <View style={styles.modal}><View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Bulk Import Documents</Text>
          <Text style={styles.subtitle}>Paste CSV rows below. Required column: doc_name.</Text>
          <TextInput
            style={[styles.input, styles.csvInput]}
            multiline
            value={csvText}
            onChangeText={setCsvText}
            placeholder="doc_name,status,storage_location,softcopy_location,last_entry_date,uploaded_to_accounting"
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={async () => {
              const result = await importDocumentsFromCsv(id, csvText);
              setCsvVisible(false);
              setCsvText('');
              load();
              const summary = `Created ${result.created_count} document${result.created_count === 1 ? '' : 's'}.`;
              const errorText = result.errors.length ? `\n\nProblems:\n${result.errors.join('\n')}` : '';
              Alert.alert('Import complete', `${summary}${errorText}`);
            }}
          >
            <Text style={styles.primaryButtonText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCsvVisible(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'amber' | 'green' }) {
  return (
    <View style={[styles.stat, styles[`stat_${tone}` as const]]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  content: { padding: 16, gap: 14 },
  centered: { flex: 1, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  back: { color: '#1e3a8a', fontWeight: '700' },
  hero: { backgroundColor: '#111827', borderRadius: 24, padding: 18, gap: 6 },
  kicker: { color: '#93c5fd', fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { color: '#dbeafe', lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  ghostButton: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  ghostButtonText: { color: '#1e3a8a', fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { color: '#6b7280', fontWeight: '600' },
  infoValue: { color: '#111827', fontWeight: '700', flex: 1, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  stat_blue: { borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  stat_amber: { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  stat_green: { borderLeftWidth: 4, borderLeftColor: '#10b981' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { color: '#6b7280', marginTop: 2, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { flex: 1, backgroundColor: '#1e3a8a', padding: 14, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  secondaryButton: { flex: 1, backgroundColor: '#dbeafe', padding: 14, borderRadius: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#1e3a8a', fontWeight: '800' },
  empty: { color: '#6b7280', textAlign: 'center', paddingVertical: 18 },
  docCard: { backgroundColor: '#f9fafb', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 },
  docTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  dotGreen: { backgroundColor: '#10b981' },
  dotAmber: { backgroundColor: '#f59e0b' },
  docTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  docMeta: { color: '#6b7280', marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: '800' },
  pillGreen: { backgroundColor: '#d1fae5', color: '#047857' },
  pillAmber: { backgroundColor: '#fef3c7', color: '#92400e' },
  flagRow: { flexDirection: 'row', gap: 10 },
  flagItem: { flex: 1, gap: 6 },
  flagLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  flagButton: { padding: 10, borderRadius: 12, alignItems: 'center' },
  flagButtonOn: { backgroundColor: '#d1fae5' },
  flagButtonOff: { backgroundColor: '#f3f4f6' },
  flagButtonText: { fontSize: 12, fontWeight: '800', color: '#111827', textAlign: 'center' },
  docActions: { flexDirection: 'row', gap: 10 },
  smallButton: { flex: 1, backgroundColor: '#eff6ff', padding: 10, borderRadius: 12, alignItems: 'center' },
  smallButtonText: { color: '#1e3a8a', fontWeight: '700' },
  smallDanger: { backgroundColor: '#fee2e2' },
  smallDangerText: { color: '#b91c1c' },
  dangerButton: { backgroundColor: '#b91c1c', padding: 14, borderRadius: 14, alignItems: 'center' },
  dangerButtonText: { color: '#fff', fontWeight: '800' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 10 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  csvInput: { minHeight: 130, textAlignVertical: 'top' },
  cancel: { textAlign: 'center', padding: 10, color: '#6b7280', fontWeight: '700' },
});
