import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { getDashboardStats, listClients, listPendingTasks } from '../../src/lib/local-db';

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    clients: { total: 0 },
    tasks: { total: 0, pending: 0, completed: 0, long_pending: 0 },
    documents: { total: 0, pending: 0, submitted: 0 },
  });
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [clientCount, setClientCount] = useState(0);

  const load = async () => {
    const [dashboard, clients, tasks] = await Promise.all([getDashboardStats(), listClients(), listPendingTasks()]);
    setStats(dashboard);
    setClientCount(clients.length);
    setPendingTasks(tasks);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={styles.title}>SHREE RAJ & CO</Text>
      <Text style={styles.subtitle}>Local-first dashboard</Text>
      <View style={styles.row}>
        <StatCard label="Clients" value={String(clientCount || stats.clients.total)} />
        <StatCard label="Tasks" value={String(stats.tasks.total)} />
        <StatCard label="Docs" value={String(stats.documents.total)} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/(tabs)/clients')}>
          <Text style={styles.buttonText}>Open Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/(tabs)/tasks')}>
          <Text style={styles.buttonText}>Open Tasks</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Tasks</Text>
        {pendingTasks.slice(0, 5).map((task) => (
          <View key={task.id} style={styles.card}>
            <Text style={styles.cardTitle}>{task.task_name}</Text>
            <Text style={styles.cardText}>{task.description || 'No description'}</Text>
          </View>
        ))}
        {pendingTasks.length === 0 && <Text style={styles.empty}>No pending tasks.</Text>}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6b7280' },
  row: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1e3a8a' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  button: { backgroundColor: '#1e3a8a', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardText: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  empty: { color: '#9ca3af' },
});
