import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, Alert } from 'react-native';
import { createTask, deleteTask, listTasks, updateTask } from '../../src/lib/local-db';

const blankForm = { task_name: '', description: '', client_id: '' };

export default function TasksScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(blankForm);

  const load = async () => setTasks(await listTasks());
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => tasks.filter((task) => `${task.task_name} ${task.description || ''}`.toLowerCase().includes(query.toLowerCase())),
    [tasks, query],
  );

  const openNew = () => {
    setEditing(null);
    setForm(blankForm);
    setVisible(true);
  };

  const openEdit = (task: any) => {
    setEditing(task);
    setForm({
      task_name: task.task_name || '',
      description: task.description || '',
      client_id: task.client_id || '',
    });
    setVisible(true);
  };

  const save = async () => {
    if (!form.task_name) {
      Alert.alert('Missing fields', 'Task name is required.');
      return;
    }
    if (editing) {
      await updateTask(editing.id, form as any);
    } else {
      await createTask(form as any);
    }
    setVisible(false);
    load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Workboard</Text>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>Keep follow-ups, filing, and reminders organized offline.</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search tasks"
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
        <Text style={styles.buttonText}>Add Task</Text>
      </TouchableOpacity>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filtered.length === 0 ? styles.listEmpty : undefined}
        ListEmptyComponent={<Text style={styles.empty}>No tasks yet. Add one to begin tracking work.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={async () => { await updateTask(item.id, { is_completed: item.is_completed ? 0 : 1 }); load(); }}>
              <View style={styles.cardTop}>
                <View style={[styles.statusDot, item.is_completed ? styles.statusDone : styles.statusPending]} />
                <View style={styles.cardMain}>
                  <Text style={styles.cardTitle}>{item.task_name}</Text>
                  <Text style={styles.cardText}>{item.description || 'No description'}</Text>
                </View>
                <Text style={[styles.badge, item.is_completed ? styles.badgeDone : styles.badgePending]}>
                  {item.is_completed ? 'Done' : 'Open'}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await deleteTask(item.id);
                  load();
                }}
                style={[styles.smallButton, styles.smallButtonDanger]}
              >
                <Text style={[styles.smallButtonText, styles.smallButtonDangerText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editing ? 'Edit Task' : 'New Task'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Task name"
              placeholderTextColor="#9ca3af"
              value={form.task_name}
              onChangeText={(text) => setForm({ ...form, task_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor="#9ca3af"
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Client ID (optional)"
              placeholderTextColor="#9ca3af"
              value={form.client_id}
              onChangeText={(text) => setForm({ ...form, client_id: text })}
            />
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
  statusDone: { backgroundColor: '#10b981' },
  statusPending: { backgroundColor: '#f59e0b' },
  cardMain: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardText: { color: '#6b7280' },
  badge: { fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeDone: { color: '#047857', backgroundColor: '#d1fae5' },
  badgePending: { color: '#92400e', backgroundColor: '#fef3c7' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallButton: { flex: 1, backgroundColor: '#eff6ff', padding: 10, borderRadius: 12, alignItems: 'center' },
  smallButtonText: { color: '#1e3a8a', fontWeight: '700' },
  smallButtonDanger: { backgroundColor: '#fee2e2' },
  smallButtonDangerText: { color: '#b91c1c' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 10 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cancel: { textAlign: 'center', padding: 10, color: '#6b7280', fontWeight: '700' },
});
