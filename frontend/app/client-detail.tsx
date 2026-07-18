import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { createDocument, deleteClient, deleteDocument, getClient, listDocuments, updateClient, updateDocument } from '../src/lib/local-db';
import { importDocumentsFromCsv } from '../src/lib/local-import';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [csvVisible, setCsvVisible] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ doc_name: '', status: 'pending', storage_location: '', softcopy_location: '', last_entry_date: '' });
  const [clientForm, setClientForm] = useState({ firm_name: '', owner_name: '', mobile: '', email: '', address: '' });

  const load = async () => {
    if (!id) return;
    setClient(await getClient(id));
    setDocuments(await listDocuments(id));
    setRefreshing(false);
  };
  useEffect(() => { load(); }, [id]);

  if (!client) return <View style={styles.container}><Text>Client not found</Text></View>;

  const saveDoc = async () => { await createDocument({ client_id: id, ...form, return_status: 0, uploaded_to_accounting: 0 } as any); setVisible(false); setForm({ doc_name: '', status: 'pending', storage_location: '', softcopy_location: '', last_entry_date: '' }); load(); };
  const saveClient = async () => { await updateClient(id, clientForm); load(); };
  const loadEditClient = () => { setClientForm(client); };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>Back</Text></TouchableOpacity>
      <Text style={styles.title}>{client.firm_name}</Text>
      <Text style={styles.text}>{client.owner_name} • {client.mobile}</Text>
      <TouchableOpacity style={styles.button} onPress={() => { loadEditClient(); setVisible(true); }}><Text style={styles.buttonText}>Add Document</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => setCsvVisible(true)}><Text style={styles.secondaryText}>Bulk Import CSV</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => { Alert.alert('Delete client?', 'This removes the client and all related data.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteClient(id); router.back(); } },
      ]); }}><Text style={styles.delete}>Delete Client</Text></TouchableOpacity>
      <Text style={styles.section}>Documents</Text>
      {documents.map((doc) => (
        <View key={doc.id} style={styles.card}>
          <Text style={styles.cardTitle}>{doc.doc_name}</Text>
          <Text style={styles.cardText}>{doc.status} • {doc.last_entry_date || 'no date'}</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={async () => { await updateDocument(doc.id, { status: doc.status === 'pending' ? 'submitted' : 'pending' }); load(); }}><Text style={styles.link}>Toggle Status</Text></TouchableOpacity>
            <TouchableOpacity onPress={async () => { await deleteDocument(doc.id); load(); }}><Text style={styles.delete}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {documents.length === 0 && <Text style={styles.text}>No documents yet.</Text>}

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modal}><View style={styles.sheet}>
          {(['doc_name', 'storage_location', 'softcopy_location', 'last_entry_date'] as const).map((key) => (
            <TextInput key={key} style={styles.input} placeholder={key} value={(form as any)[key]} onChangeText={(text) => setForm({ ...form, [key]: text })} />
          ))}
          <TouchableOpacity style={styles.button} onPress={saveDoc}><Text style={styles.buttonText}>Save</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setVisible(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={csvVisible} transparent animationType="slide">
        <View style={styles.modal}><View style={styles.sheet}>
          <Text style={styles.section}>Paste CSV Text</Text>
          <TextInput style={[styles.input, styles.csv]} multiline value={csvText} onChangeText={setCsvText} />
          <TouchableOpacity style={styles.button} onPress={async () => { await importDocumentsFromCsv(id, csvText); setCsvVisible(false); setCsvText(''); load(); }}><Text style={styles.buttonText}>Import</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setCsvVisible(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={false} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  back: { color: '#1e3a8a', fontWeight: '700', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  text: { color: '#6b7280', marginTop: 6 },
  section: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 10 },
  button: { backgroundColor: '#1e3a8a', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: '#eff6ff', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  secondaryText: { color: '#1e3a8a', fontWeight: '700' },
  delete: { color: '#dc2626', fontWeight: '700', textAlign: 'center', marginTop: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, gap: 8 },
  cardTitle: { fontWeight: '700', fontSize: 16 },
  cardText: { color: '#6b7280' },
  row: { flexDirection: 'row', gap: 16 },
  link: { color: '#1e3a8a', fontWeight: '700' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 10 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12 },
  csv: { minHeight: 140, textAlignVertical: 'top' },
  cancel: { textAlign: 'center', padding: 10, color: '#6b7280' },
});
