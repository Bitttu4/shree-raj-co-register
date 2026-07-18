import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { createClient, deleteClient, listClients, updateClient } from '../../src/lib/local-db';

export default function ClientsScreen() {
  const [clients, setClients] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ firm_name: '', owner_name: '', mobile: '', email: '', address: '' });

  const load = async () => setClients(await listClients());
  useEffect(() => { load(); }, []);
  const filtered = clients.filter((c) => `${c.firm_name} ${c.owner_name} ${c.mobile}`.toLowerCase().includes(query.toLowerCase()));

  const openNew = () => { setEditing(null); setForm({ firm_name: '', owner_name: '', mobile: '', email: '', address: '' }); setVisible(true); };
  const openEdit = (client: any) => { setEditing(client); setForm(client); setVisible(true); };
  const save = async () => {
    if (!form.firm_name || !form.owner_name || !form.mobile) return Alert.alert('Missing fields', 'Fill required fields');
    if (editing) await updateClient(editing.id, form); else await createClient(form as any);
    setVisible(false); load();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clients</Text>
      <TextInput style={styles.search} placeholder="Search clients" value={query} onChangeText={setQuery} />
      <TouchableOpacity style={styles.button} onPress={openNew}><Text style={styles.buttonText}>Add Client</Text></TouchableOpacity>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/client-detail?id=${item.id}`)} onLongPress={() => Alert.alert('Delete client?', item.firm_name, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await deleteClient(item.id); load(); } },
          ])}>
            <Text style={styles.cardTitle}>{item.firm_name}</Text>
            <Text style={styles.cardText}>{item.owner_name} • {item.mobile}</Text>
            <TouchableOpacity onPress={() => openEdit(item)}><Text style={styles.link}>Edit</Text></TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modal}><View style={styles.sheet}>
          {(['firm_name','owner_name','mobile','email','address'] as const).map((key) => (
            <TextInput key={key} style={styles.input} placeholder={key} value={form[key]} onChangeText={(text) => setForm({ ...form, [key]: text })} />
          ))}
          <TouchableOpacity style={styles.button} onPress={save}><Text style={styles.buttonText}>Save</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setVisible(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f3f4f6' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  search: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12 },
  button: { backgroundColor: '#1e3a8a', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 14, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardText: { color: '#6b7280', marginTop: 4 },
  link: { marginTop: 8, color: '#1e3a8a', fontWeight: '700' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 10 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12 },
  cancel: { textAlign: 'center', padding: 10, color: '#6b7280' },
});
