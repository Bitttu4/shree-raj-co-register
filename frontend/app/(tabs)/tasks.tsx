import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, Alert } from 'react-native';
import { createTask, deleteTask, listTasks, updateTask } from '../../src/lib/local-db';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ task_name: '', description: '', client_id: '' });

  const load = async () => setTasks(await listTasks());
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.task_name) return Alert.alert('Missing fields', 'Task name is required');
    if (editing) await updateTask(editing.id, form as any); else await createTask(form as any);
    setVisible(false); load();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>
      <TouchableOpacity style={styles.button} onPress={() => { setEditing(null); setForm({ task_name: '', description: '', client_id: '' }); setVisible(true); }}>
        <Text style={styles.buttonText}>Add Task</Text>
      </TouchableOpacity>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={async () => { await updateTask(item.id, { is_completed: item.is_completed ? 0 : 1 }); load(); }}>
              <Text style={styles.cardTitle}>{item.task_name}</Text>
              <Text style={styles.cardText}>{item.description || 'No description'}</Text>
              <Text style={styles.badge}>{item.is_completed ? 'Completed' : 'Pending'}</Text>
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => { setEditing(item); setForm(item); setVisible(true); }}><Text style={styles.link}>Edit</Text></TouchableOpacity>
              <TouchableOpacity onPress={async () => { await deleteTask(item.id); load(); }}><Text style={styles.delete}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modal}><View style={styles.sheet}>
          <TextInput style={styles.input} placeholder="Task name" value={form.task_name} onChangeText={(text) => setForm({ ...form, task_name: text })} />
          <TextInput style={styles.input} placeholder="Description" value={form.description} onChangeText={(text) => setForm({ ...form, description: text })} />
          <TextInput style={styles.input} placeholder="Client ID (optional)" value={form.client_id} onChangeText={(text) => setForm({ ...form, client_id: text })} />
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
  button: { backgroundColor: '#1e3a8a', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 14, marginBottom: 10, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardText: { color: '#6b7280' },
  badge: { color: '#1e3a8a', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  link: { color: '#1e3a8a', fontWeight: '700' },
  delete: { color: '#dc2626', fontWeight: '700' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 10 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12 },
  cancel: { textAlign: 'center', padding: 10, color: '#6b7280' },
});
