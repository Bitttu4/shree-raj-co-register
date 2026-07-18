import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { createClient, deleteClient, listClients, updateClient } from '../../src/lib/local-db';

const blankForm = { firm_name: '', owner_name: '', mobile: '', email: '', address: '' };

export default function ClientsScreen() {
  const [clients, setClients] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(blankForm);

  const load = async () => setClients(await listClients());
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => clients.filter((c) => `${c.firm_name} ${c.owner_name} ${c.mobile}`.toLowerCase().includes(query.toLowerCase())),
    [clients, query],
  );

  const openNew = () => {
    setEditing(null);
    setForm(blankForm);
    setVisible(true);
  };

  const openEdit = (client: any) => {
    setEditing(client);
    setForm({
      firm_name: client.firm_name || '',
      owner_name: client.owner_name || '',
      mobile: client.mobile || '',
      email: client.email || '',
      address: client.address || '',
    });
    setVisible(true);
  };

  const save = async () => {
    if (!form.firm_name || !form.owner_name || !form.mobile) {
      Alert.alert('Missing fields', 'Please fill in the required client details.');
      return;
    }
    if (editing) {
      await updateClient(editing.id, form);
    } else {
      await createClient(form as any);
    }
    setVisible(false);
    load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Directory</Text>
        <Text style={styles.title}>Clients</Text>
        <Text style={styles.subtitle}>Search, open, and edit every client from one clean list.</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search by firm, owner, or mobile"
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={() => setQuery('')}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={openNew}>
        <Text style={styles.buttonText}>Add Client</Text>
      </TouchableOpacity>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filtered.length === 0 ? styles.listEmpty : undefined}
        ListEmptyComponent={<Text style={styles.empty}>No clients yet. Add your first client to get started.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/client-detail?id=${item.id}`)}
            onLongPress={() =>
              Alert.alert('Delete client?', item.firm_name, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteClient(item.id);
                    load();
                  },
                },
              ])
            }
          >
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.firm_name || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>{item.firm_name}</Text>
                <Text style={styles.cardText}>{item.owner_name}</Text>
                <Text style={styles.muted}>{item.mobile}</Text>
              </View>
              <TouchableOpacity style={styles.editPill} onPress={() => openEdit(item)}>
                <Text style={styles.editPillText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editing ? 'Edit Client' : 'New Client'}</Text>
            {(['firm_name', 'owner_name', 'mobile', 'email', 'address'] as const).map((key) => (
              <TextInput
                key={key}
                style={styles.input}
                placeholder={key.replace('_', ' ')}
                placeholderTextColor="#9ca3af"
                value={form[key]}
                onChangeText={(text) => setForm({ ...form, [key]: text })}
              />
            ))}
            <TouchableOpacity style={styles.button} onPress={save}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#eef2ff' },
  header: { marginBottom: 12, gap: 4 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1, color: '#1e3a8a', fontWeight: '700', fontSize: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { color: '#6b7280', lineHeight: 20 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  search: { flex: 1, backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  clearButton: { backgroundColor: '#dbeafe', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  clearButtonText: { color: '#1e3a8a', fontWeight: '700' },
  button: { backgroundColor: '#1e3a8a', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  cardMain: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardText: { color: '#6b7280' },
  muted: { color: '#9ca3af', fontSize: 12 },
  editPill: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  editPillText: { color: '#1e3a8a', fontWeight: '700' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 10 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cancel: { textAlign: 'center', padding: 10, color: '#6b7280', fontWeight: '700' },
});
