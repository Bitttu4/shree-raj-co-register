import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

// Lazy load notifications to avoid Expo Go crashes
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  console.log('Notifications not available:', e);
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface DashboardStats {
  clients: { total: number };
  tasks: {
    total: number;
    pending: number;
    completed: number;
    long_pending: number;
  };
  documents: {
    total: number;
    pending: number;
    submitted: number;
  };
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    checkPendingTasks();
    requestNotificationPermissions();
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const requestNotificationPermissions = async () => {
    if (!Notifications?.getPermissionsAsync) return;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
      }
    } catch (e) {
      console.log('Notification permission error:', e);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkPendingTasks = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/pending`);
      const pendingTasks = await response.json();
      
      if (pendingTasks.length > 0 && Notifications?.scheduleNotificationAsync) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Good Morning! ☀️',
              body: `You have ${pendingTasks.length} pending tasks to complete today.`,
              data: { tasks: pendingTasks },
            },
            trigger: null,
          });
        } catch (notifErr) {
          console.log('Notification scheduling not available:', notifErr);
        }
      }
    } catch (error) {
      console.error('Error checking pending tasks:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeText}>Welcome to SHREE RAJ & CO</Text>
              {user && (
                <Text style={styles.userText}>
                  Signed in as {user.name || user.email}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              testID="sign-out-button"
            >
              <MaterialIcons name="logout" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <Text style={styles.welcomeSubtext}>Register Management System</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Clients Card */}
          <TouchableOpacity
            style={[styles.statCard, styles.blueCard]}
            onPress={() => router.push('/clients')}
          >
            <MaterialIcons name="people" size={32} color="#ffffff" />
            <Text style={styles.statNumber}>{stats?.clients.total || 0}</Text>
            <Text style={styles.statLabel}>Total Clients</Text>
          </TouchableOpacity>

          {/* Pending Tasks Card */}
          <TouchableOpacity
            style={[styles.statCard, styles.orangeCard]}
            onPress={() => router.push('/tasks')}
          >
            <MaterialIcons name="pending-actions" size={32} color="#ffffff" />
            <Text style={styles.statNumber}>{stats?.tasks.pending || 0}</Text>
            <Text style={styles.statLabel}>Pending Tasks</Text>
          </TouchableOpacity>

          {/* Pending Documents Card */}
          <TouchableOpacity
            style={[styles.statCard, styles.redCard]}
          >
            <MaterialIcons name="description" size={32} color="#ffffff" />
            <Text style={styles.statNumber}>{stats?.documents.pending || 0}</Text>
            <Text style={styles.statLabel}>Pending Docs</Text>
          </TouchableOpacity>

          {/* Completed Tasks Card */}
          <TouchableOpacity
            style={[styles.statCard, styles.greenCard]}
            onPress={() => router.push('/tasks')}
          >
            <MaterialIcons name="check-circle" size={32} color="#ffffff" />
            <Text style={styles.statNumber}>{stats?.tasks.completed || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </TouchableOpacity>
        </View>

        {/* Alerts Section */}
        {(stats?.tasks.long_pending || 0) > 0 && (
          <View style={styles.alertCard}>
            <MaterialIcons name="warning" size={24} color="#f59e0b" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Attention Required!</Text>
              <Text style={styles.alertText}>
                {stats?.tasks.long_pending} tasks pending for more than 7 days
              </Text>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.quickStatsCard}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          
          <View style={styles.quickStatRow}>
            <Text style={styles.quickStatLabel}>Total Tasks</Text>
            <Text style={styles.quickStatValue}>{stats?.tasks.total || 0}</Text>
          </View>
          
          <View style={styles.quickStatRow}>
            <Text style={styles.quickStatLabel}>Total Documents</Text>
            <Text style={styles.quickStatValue}>{stats?.documents.total || 0}</Text>
          </View>
          
          <View style={styles.quickStatRow}>
            <Text style={styles.quickStatLabel}>Submitted Documents</Text>
            <Text style={styles.quickStatValue}>{stats?.documents.submitted || 0}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  welcomeTextContainer: { flex: 1 },
  userText: {
    fontSize: 13,
    color: '#1e3a8a',
    marginTop: 4,
    fontWeight: '500',
  },
  signOutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  welcomeSubtext: {
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
    width: '48%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  blueCard: {
    backgroundColor: '#1e3a8a',
  },
  orangeCard: {
    backgroundColor: '#f59e0b',
  },
  redCard: {
    backgroundColor: '#ef4444',
  },
  greenCard: {
    backgroundColor: '#10b981',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#92400e',
  },
  quickStatsCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  quickStatLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  quickStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
});
