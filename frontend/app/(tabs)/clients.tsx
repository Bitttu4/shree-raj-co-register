import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Client {
  id: string;
  firm_name: string;
  owner_name: string;
  mobile: string;
  email?: string;
  address?: string;
  created_at: string;
}

export default function ClientsScreen() {
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    firm_name: '',
    owner_name: '',
    mobile: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/clients`);
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firm_name: '',
      owner_name: '',
      mobile: '',
      email: '',
      address: '',
    });
    setEditingClient(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      firm_name: client.firm_name,
      owner_name: client.owner_name,
      mobile: client.mobile,
      email: client.email || '',
      address: client.address || '',
    });
    setModalVisible(true);
  };

  const handleSaveClient = async () => {
    if (!formData.firm_name || !formData.owner_name || !formData.mobile) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const url = editingClient
        ? `${BACKEND_URL}/api/clients/${editingClient.id}`
        : `${BACKEND_URL}/api/clients`;
      const method = editingClient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setModalVisible(false);
        resetForm();
        fetchClients();
      } else {
        Alert.alert('Error', `Failed to ${editingClient ? 'update' : 'create'} client`);
      }
    } catch (error) {
      console.error('Error saving client:', error);
      Alert.alert('Error', 'Failed to save client');
    }
  };

  const handleDeleteClient = (client: Client) => {
    Alert.alert(
      'Delete Client',
      `Delete "${client.firm_name}"? This will also delete all related documents and tasks.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/clients/${client.id}`, { method: 'DELETE' });
              fetchClients();
            } catch (error) {
              console.error('Error deleting client:', error);
            }
          },
        },
      ]
    );
  };

  const pickCsvFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const file = result.assets[0];
      const response = await fetch(file.uri);
      const text = await response.text();
      setCsvText(text);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Could not read CSV file');
    }
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) {
      Alert.alert('Error', 'Please provide CSV data');
      return;
    }

    setBulkLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/bulk/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ csv_data: csvText }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Import Complete',
          `Created ${data.created_count} clients.${data.errors.length > 0 ? `\n\n${data.errors.length} errors:\n${data.errors.slice(0, 5).join('\n')}` : ''}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setBulkModalVisible(false);
                setCsvText('');
                fetchClients();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', data.detail || 'Failed to import');
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      Alert.alert('Error', 'Failed to import clients');
    } finally {
      setBulkLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.firm_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.mobile.includes(searchQuery)
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar with Bulk Import */}
      <View style={styles.topRow}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.bulkButton}
          onPress={() => setBulkModalVisible(true)}
          testID="bulk-import-button"
        >
          <MaterialCommunityIcons name="file-upload" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Clients List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredClients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No clients found</Text>
            <Text style={styles.emptySubtext}>
              Add your first client to get started
            </Text>
          </View>
        ) : (
          filteredClients.map((client) => (
            <TouchableOpacity
              key={client.id}
              style={styles.clientCard}
              onPress={() => router.push(`/client-detail?id=${client.id}`)}
              onLongPress={() => handleDeleteClient(client)}
            >
              <View style={styles.clientHeader}>
                <View style={styles.clientIcon}>
                  <MaterialIcons name="business" size={24} color="#1e3a8a" />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.firm_name}</Text>
                  <Text style={styles.clientOwner}>{client.owner_name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={() => openEditModal(client)}
                >
                  <MaterialIcons name="edit" size={20} color="#1e3a8a" />
                </TouchableOpacity>
              </View>
              <View style={styles.clientDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{client.mobile}</Text>
                </View>
                {client.email && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="email" size={16} color="#646c7c" />
                    <Text style={styles.detailText}>{client.email}</Text>
                  </View>
                )}
              </View>
              <View style={styles.hintRow}>
                <Text style={styles.hintText}>
                  {'Tap to view docs • Long press to delete'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <MaterialIcons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* Add/Edit Client Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Firm Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter firm name"
                value={formData.firm_name}
                onChangeText={(text) => setFormData({ ...formData, firm_name: text })}
              />

              <Text style={styles.inputLabel}>Owner Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter owner name"
                value={formData.owner_name}
                onChangeText={(text) => setFormData({ ...formData, owner_name: text })}
              />

              <Text style={styles.inputLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
                value={formData.mobile}
                onChangeText={(text) => setFormData({ ...formData, mobile: text })}
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter address"
                multiline
                numberOfLines={3}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setModalVisible(false); resetForm(); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSaveClient}>
                <Text style={styles.submitButtonText}>
                  {editingClient ? 'Update' : 'Create Client'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        visible={bulkModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBulkModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Import Clients</Text>
              <TouchableOpacity onPress={() => { setBulkModalVisible(false); setCsvText(''); }}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.csvInfoBox}>
                <MaterialIcons name="info-outline" size={18} color="#1e3a8a" />
                <View style={styles.csvInfoContent}>
                  <Text style={styles.csvInfoTitle}>CSV Format</Text>
                  <Text style={styles.csvInfoText}>
                    Required columns: firm_name, owner_name, mobile{'\n'}
                    Optional: email, address{'\n\n'}
                    First row must be headers
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.pickFileButton}
                onPress={pickCsvFile}
                testID="pick-csv-file"
              >
                <MaterialCommunityIcons name="file-document-outline" size={24} color="#1e3a8a" />
                <Text style={styles.pickFileButtonText}>Pick CSV File</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Or Paste CSV Data</Text>
              <TextInput
                style={[styles.input, styles.csvTextArea]}
                placeholder="firm_name,owner_name,mobile,email,address&#10;ABC Ltd,John Doe,9876543210,john@abc.com,Mumbai&#10;XYZ Corp,Jane Smith,9876543211,jane@xyz.com,Delhi"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={10}
                value={csvText}
                onChangeText={setCsvText}
                testID="csv-text-input"
              />

              {csvText.length > 0 && (
                <Text style={styles.csvPreviewText}>
                  {csvText.split('\n').filter(l => l.trim()).length} rows detected
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setBulkModalVisible(false); setCsvText(''); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, bulkLoading && { opacity: 0.7 }]}
                onPress={handleBulkImport}
                disabled={bulkLoading}
                testID="bulk-import-submit"
              >
                {bulkLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Import</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6',
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10,
  },
  bulkButton: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#1e3a8a',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  csvInfoBox: {
    flexDirection: 'row', backgroundColor: '#eff6ff',
    padding: 12, borderRadius: 8, marginBottom: 16, gap: 10,
  },
  csvInfoContent: { flex: 1 },
  csvInfoTitle: {
    fontSize: 13, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 4,
  },
  csvInfoText: { fontSize: 12, color: '#1e3a8a', lineHeight: 18 },
  pickFileButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eff6ff', padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#1e3a8a', gap: 8, marginBottom: 12,
  },
  pickFileButtonText: {
    fontSize: 15, fontWeight: '600', color: '#1e3a8a',
  },
  csvTextArea: {
    height: 160, textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
  },
  csvPreviewText: {
    fontSize: 12, color: '#10b981', marginTop: 8,
    fontWeight: '600', textAlign: 'right',
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1f2937' },
  listContainer: { flex: 1, paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 20, fontWeight: '600', color: '#6b7280', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  clientCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  clientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  clientIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  clientOwner: { fontSize: 14, color: '#6b7280' },
  editIconButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  clientDetails: { paddingLeft: 60 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailText: { fontSize: 14, color: '#6b7280', marginLeft: 8 },
  hintRow: {
    paddingLeft: 60, marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  hintText: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },
  fab: {
    position: 'absolute', right: 24, bottom: 24,
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#1e3a8a',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  modalBody: { padding: 20 },
  inputLabel: {
    fontSize: 14, fontWeight: '600', color: '#374151',
    marginBottom: 8, marginTop: 12,
  },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 8, padding: 12, fontSize: 16, color: '#1f2937',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalFooter: {
    flexDirection: 'row', padding: 20,
    borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 12,
  },
  cancelButton: {
    flex: 1, padding: 16, borderRadius: 8,
    borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  submitButton: {
    flex: 1, padding: 16, borderRadius: 8,
    backgroundColor: '#1e3a8a', alignItems: 'center',
  },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});