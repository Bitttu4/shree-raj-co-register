import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SummaryData {
  summary: string;
  date: string;
  stats: {
    total_clients: number;
    documents_submitted_today: number;
    tasks_assigned_today: number;
    tasks_completed_today: number;
    pending_tasks: number;
  };
}

export default function SummaryScreen() {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/daily-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      } else {
        Alert.alert('Error', 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      Alert.alert('Error', 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const shareSummary = async () => {
    if (!summaryData) return;

    try {
      await Share.share({
        message: `SHREE RAJ & CO - Daily Summary\n\n${summaryData.summary}`,
        title: 'Daily Summary',
      });
    } catch (error) {
      console.error('Error sharing summary:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <MaterialIcons name="assessment" size={48} color="#2563eb" />
          <Text style={styles.headerTitle}>Daily Summary Report</Text>
          <Text style={styles.headerSubtitle}>
            Generate AI-powered summary for today's activities
          </Text>
        </View>

        {/* Generate Button */}
        {!summaryData && (
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateSummary}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={24} color="#ffffff" />
                <Text style={styles.generateButtonText}>
                  Generate Today's Summary
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>
              AI is generating your summary...
            </Text>
          </View>
        )}

        {/* Summary Display */}
        {summaryData && (
          <>
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {summaryData.stats.total_clients}
                </Text>
                <Text style={styles.statLabel}>Total Clients</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {summaryData.stats.documents_submitted_today}
                </Text>
                <Text style={styles.statLabel}>Docs Submitted</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {summaryData.stats.tasks_assigned_today}
                </Text>
                <Text style={styles.statLabel}>Tasks Assigned</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {summaryData.stats.tasks_completed_today}
                </Text>
                <Text style={styles.statLabel}>Tasks Done</Text>
              </View>
            </View>

            {/* Summary Content */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Summary Report</Text>
                <Text style={styles.summaryDate}>{summaryData.date}</Text>
              </View>
              <View style={styles.copyHintBox}>
                <MaterialIcons name="content-copy" size={16} color="#10b981" />
                <Text style={styles.copyHintText}>
                  Plain text format - ready to copy & paste to WhatsApp
                </Text>
              </View>
              <Text style={styles.summaryText} selectable>{summaryData.summary}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={shareSummary}
              >
                <MaterialIcons name="share" size={20} color="#ffffff" />
                <Text style={styles.shareButtonText}>Share via WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={generateSummary}
              >
                <MaterialIcons name="refresh" size={20} color="#1e3a8a" />
                <Text style={styles.regenerateButtonText}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Info Card */}
        {!summaryData && !loading && (
          <View style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={24} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>About Daily Summary</Text>
              <Text style={styles.infoText}>
                The AI will analyze today's activities including:
              </Text>
              <Text style={styles.infoItem}>• Documents submitted by clients</Text>
              <Text style={styles.infoItem}>• Tasks assigned and completed</Text>
              <Text style={styles.infoItem}>• Pending tasks overview</Text>
              <Text style={styles.infoItem}>• Key metrics and recommendations</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  generateButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#ffffff',
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  summaryDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#25d366',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  regenerateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  copyHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  copyHintText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 13,
    color: '#1e40af',
    marginLeft: 8,
    marginBottom: 4,
  },
});