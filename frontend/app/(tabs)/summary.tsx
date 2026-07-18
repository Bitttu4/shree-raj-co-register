import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getDashboardStats } from '../../src/lib/local-db';

export default function SummaryScreen() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { getDashboardStats().then(setStats); }, []);
  if (!stats) return <View style={styles.container}><Text>Loading summary...</Text></View>;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Summary</Text>
      <Card label="Clients" value={stats.clients.total} />
      <Card label="Tasks Pending" value={stats.tasks.pending} />
      <Card label="Tasks Completed" value={stats.tasks.completed} />
      <Card label="Documents Pending" value={stats.documents.pending} />
      <Card label="Documents Submitted" value={stats.documents.submitted} />
    </ScrollView>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return <View style={styles.card}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f3f4f6', gap: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  value: { fontSize: 26, fontWeight: '800', color: '#1e3a8a' },
  label: { color: '#6b7280', marginTop: 4 },
});
