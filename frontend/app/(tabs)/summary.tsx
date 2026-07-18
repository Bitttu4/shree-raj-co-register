import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getDashboardStats } from '../../src/lib/local-db';

export default function SummaryScreen() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getDashboardStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading summary...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Overview</Text>
      <Text style={styles.title}>Summary</Text>
      <Text style={styles.subtitle}>A quick local snapshot of your firm&apos;s workload.</Text>
      <View style={styles.grid}>
        <Card label="Clients" value={stats.clients.total} tone="blue" />
        <Card label="Tasks Pending" value={stats.tasks.pending} tone="amber" />
        <Card label="Tasks Completed" value={stats.tasks.completed} tone="green" />
        <Card label="Documents Pending" value={stats.documents.pending} tone="red" />
        <Card label="Documents Submitted" value={stats.documents.submitted} tone="blue" />
      </View>
    </ScrollView>
  );
}

function Card({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'amber' | 'green' | 'red' }) {
  return (
    <View style={[styles.card, styles[`card_${tone}` as const]]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef2ff' },
  loadingText: { color: '#6b7280', fontWeight: '700' },
  container: { flex: 1, backgroundColor: '#eef2ff' },
  content: { padding: 16, gap: 10 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1, color: '#1e3a8a', fontWeight: '700', fontSize: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { color: '#6b7280', marginBottom: 8 },
  grid: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  card_blue: { borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  card_amber: { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  card_green: { borderLeftWidth: 4, borderLeftColor: '#10b981' },
  card_red: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  value: { fontSize: 26, fontWeight: '800', color: '#111827' },
  label: { color: '#6b7280', marginTop: 4, fontWeight: '600' },
});
