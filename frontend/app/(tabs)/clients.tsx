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
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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
                    <MaterialIcons name="email" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{client.email}</Text>
                  </View>
                )}
              </View>
              <View style={styles.hintRow}>
                <Text style={styles.hintText}>Tap to view docs • Long press to delete</Text>
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
    margin: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
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
