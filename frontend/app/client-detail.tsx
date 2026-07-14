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
  Share,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Client {
  id: string;
  firm_name: string;
  owner_name: string;
  mobile: string;
  email?: string;
  address?: string;
}

interface Document {
  id: string;
  client_id: string;
  doc_name: string;
  status: 'submitted' | 'pending';
  storage_location?: string;
  softcopy_location?: string;
  return_status: boolean;
  last_entry_date?: string;
  uploaded_to_accounting: boolean;
  created_at: string;
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams();
  const [client, setClient] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [editDocModalVisible, setEditDocModalVisible] = useState(false);
  const [editClientModalVisible, setEditClientModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [cheatsheetModalVisible, setCheatsheetModalVisible] = useState(false);
  const [bulkDocsModalVisible, setBulkDocsModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // AI states
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [cheatsheetContent, setCheatsheetContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Bulk import states
  const [docsCsvText, setDocsCsvText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Currently editing document
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  const [docFormData, setDocFormData] = useState({
    doc_name: '',
    status: 'pending',
    storage_location: '',
    softcopy_location: '',
    return_status: false,
    last_entry_date: '',
    uploaded_to_accounting: false,
  });

  const [clientFormData, setClientFormData] = useState({
    firm_name: '',
    owner_name: '',
    mobile: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      const [clientRes, docsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/clients/${id}`),
        fetch(`${BACKEND_URL}/api/documents/client/${id}`),
      ]);

      const clientData = await clientRes.json();
      const docsData = await docsRes.json();

      setClient(clientData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Error fetching client data:', error);
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetDocForm = () => {
    setDocFormData({
      doc_name: '',
      status: 'pending',
      storage_location: '',
      softcopy_location: '',
      return_status: false,
      last_entry_date: '',
      uploaded_to_accounting: false,
    });
  };

  const handleCreateDocument = async () => {
    if (!docFormData.doc_name) {
      Alert.alert('Error', 'Please enter document name');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...docFormData,
          client_id: id,
        }),
      });

      if (response.ok) {
        setDocModalVisible(false);
        resetDocForm();
        fetchClientData();
      } else {
        Alert.alert('Error', 'Failed to add document');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      Alert.alert('Error', 'Failed to add document');
    }
  };

  const openEditDocModal = (doc: Document) => {
    setEditingDoc(doc);
    setDocFormData({
      doc_name: doc.doc_name,
      status: doc.status,
      storage_location: doc.storage_location || '',
      softcopy_location: doc.softcopy_location || '',
      return_status: doc.return_status,
      last_entry_date: doc.last_entry_date || '',
      uploaded_to_accounting: doc.uploaded_to_accounting,
    });
    setEditDocModalVisible(true);
  };

  const handleUpdateDocument = async () => {
    if (!editingDoc || !docFormData.doc_name) {
      Alert.alert('Error', 'Please enter document name');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/documents/${editingDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docFormData),
      });

      if (response.ok) {
        setEditDocModalVisible(false);
        setEditingDoc(null);
        resetDocForm();
        fetchClientData();
      } else {
        Alert.alert('Error', 'Failed to update document');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      Alert.alert('Error', 'Failed to update document');
    }
  };

  const deleteDocument = (docId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/documents/${docId}`, { method: 'DELETE' });
              fetchClientData();
            } catch (error) {
              console.error('Error deleting document:', error);
            }
          },
        },
      ]
    );
  };

  const toggleDocumentStatus = async (docId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'submitted' ? 'pending' : 'submitted';
    try {
      await fetch(`${BACKEND_URL}/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchClientData();
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const toggleReturnStatus = async (docId: string, currentStatus: boolean) => {
    try {
      await fetch(`${BACKEND_URL}/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_status: !currentStatus }),
      });
      fetchClientData();
    } catch (error) {
      console.error('Error updating return status:', error);
    }
  };

  const toggleAccountingUpload = async (docId: string, currentStatus: boolean) => {
    try {
      await fetch(`${BACKEND_URL}/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploaded_to_accounting: !currentStatus }),
      });
      fetchClientData();
    } catch (error) {
      console.error('Error updating accounting status:', error);
    }
  };

  const openEditClientModal = () => {
    if (client) {
      setClientFormData({
        firm_name: client.firm_name,
        owner_name: client.owner_name,
        mobile: client.mobile,
        email: client.email || '',
        address: client.address || '',
      });
      setEditClientModalVisible(true);
    }
  };

  const handleUpdateClient = async () => {
    if (!clientFormData.firm_name || !clientFormData.owner_name || !clientFormData.mobile) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientFormData),
      });

      if (response.ok) {
        setEditClientModalVisible(false);
        fetchClientData();
      } else {
        Alert.alert('Error', 'Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert('Error', 'Failed to update client');
    }
  };

  const generateClientMessage = async () => {
    setAiLoading(true);
    setGeneratedMessage('');
    setMessageModalVisible(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: id,
          message_type: 'pending_docs',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedMessage(data.message);
      } else {
        Alert.alert('Error', 'Failed to generate message');
      }
    } catch (error) {
      console.error('Error generating message:', error);
      Alert.alert('Error', 'Failed to generate message');
    } finally {
      setAiLoading(false);
    }
  };

  const generateCheatsheet = async () => {
    setAiLoading(true);
    setCheatsheetContent('');
    setCheatsheetModalVisible(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/generate-cheatsheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: id }),
      });

      if (response.ok) {
        const data = await response.json();
        setCheatsheetContent(data.content);
      } else {
        Alert.alert('Error', 'Failed to generate cheatsheet');
      }
    } catch (error) {
      console.error('Error generating cheatsheet:', error);
      Alert.alert('Error', 'Failed to generate cheatsheet');
    } finally {
      setAiLoading(false);
    }
  };

  const shareMessage = async () => {
    try {
      await Share.share({ message: generatedMessage });
    } catch (error) {
      console.error('Error sharing message:', error);
    }
  };

  const shareCheatsheet = async () => {
    try {
      await Share.share({ message: cheatsheetContent });
    } catch (error) {
      console.error('Error sharing cheatsheet:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setDocFormData({ ...docFormData, last_entry_date: dateStr });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClientData();
  };

  const pickDocsCsvFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || !result.assets[0]) return;

      const file = result.assets[0];
      const response = await fetch(file.uri);
      const text = await response.text();
      setDocsCsvText(text);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Could not read CSV file');
    }
  };

  const handleBulkDocsImport = async () => {
    if (!docsCsvText.trim()) {
      Alert.alert('Error', 'Please provide CSV data');
      return;
    }

    setBulkLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/bulk/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: id, csv_data: docsCsvText }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Import Complete',
          `Created ${data.created_count} documents.${data.errors.length > 0 ? `\n\n${data.errors.length} errors:\n${data.errors.slice(0, 3).join('\n')}` : ''}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setBulkDocsModalVisible(false);
                setDocsCsvText('');
                fetchClientData();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', data.detail || 'Failed to import');
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      Alert.alert('Error', 'Failed to import documents');
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.loadingText}>Loading client data...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Client not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const submittedDocs = documents.filter((d) => d.status === 'submitted');
  const pendingDocs = documents.filter((d) => d.status === 'pending');

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>SHREE RAJ & CO</Text>
            <Text style={styles.headerSubtitle}>{client.firm_name}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Client Info Card with Edit Button */}
        <View style={styles.clientCard}>
          <View style={styles.clientCardHeader}>
            <Text style={styles.clientCardTitle}>Client Information</Text>
            <TouchableOpacity
              onPress={openEditClientModal}
              style={styles.editButton}
            >
              <MaterialIcons name="edit" size={20} color="#1e3a8a" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.clientRow}>
            <MaterialIcons name="business" size={20} color="#6b7280" />
            <Text style={styles.clientLabel}>Firm:</Text>
            <Text style={styles.clientValue}>{client.firm_name}</Text>
          </View>
          <View style={styles.clientRow}>
            <MaterialIcons name="person" size={20} color="#6b7280" />
            <Text style={styles.clientLabel}>Owner:</Text>
            <Text style={styles.clientValue}>{client.owner_name}</Text>
          </View>
          <View style={styles.clientRow}>
            <MaterialIcons name="phone" size={20} color="#6b7280" />
            <Text style={styles.clientLabel}>Mobile:</Text>
            <Text style={styles.clientValue}>{client.mobile}</Text>
          </View>
          {client.email && (
            <View style={styles.clientRow}>
              <MaterialIcons name="email" size={20} color="#6b7280" />
              <Text style={styles.clientLabel}>Email:</Text>
              <Text style={styles.clientValue}>{client.email}</Text>
            </View>
          )}
          {client.address && (
            <View style={styles.clientRow}>
              <MaterialIcons name="location-on" size={20} color="#6b7280" />
              <Text style={styles.clientLabel}>Address:</Text>
              <Text style={styles.clientValue}>{client.address}</Text>
            </View>
          )}
        </View>

        {/* Document Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, styles.pendingBox]}>
            <Text style={styles.statNumber}>{pendingDocs.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statBox, styles.submittedBox]}>
            <Text style={styles.statNumber}>{submittedDocs.length}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
          <View style={[styles.statBox, styles.totalBox]}>
            <Text style={styles.statNumber}>{documents.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* AI Actions */}
        <View style={styles.aiActionsCard}>
          <Text style={styles.sectionTitle}>AI-Powered Actions</Text>
          <View style={styles.aiButtonsRow}>
            <TouchableOpacity style={styles.aiButton} onPress={generateClientMessage}>
              <MaterialIcons name="message" size={20} color="#1e3a8a" />
              <Text style={styles.aiButtonText}>Generate Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiButton} onPress={generateCheatsheet}>
              <MaterialCommunityIcons name="file-document" size={20} color="#1e3a8a" />
              <Text style={styles.aiButtonText}>Cheatsheet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Documents List */}
        <View style={styles.documentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity
                onPress={() => setBulkDocsModalVisible(true)}
                style={styles.bulkDocsIcon}
                testID="bulk-docs-import"
              >
                <MaterialCommunityIcons name="file-upload" size={22} color="#1e3a8a" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { resetDocForm(); setDocModalVisible(true); }}>
                <MaterialIcons name="add-circle" size={32} color="#1e3a8a" />
              </TouchableOpacity>
            </View>
          </View>

          {documents.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="description" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No documents added yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add documents</Text>
            </View>
          ) : (
            documents.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.docCard}
                onPress={() => openEditDocModal(doc)}
                onLongPress={() => deleteDocument(doc.id)}
              >
                <View style={styles.docHeader}>
                  <View style={styles.docTitleRow}>
                    <Text style={styles.docName}>{doc.doc_name}</Text>
                    <TouchableOpacity
                      style={[
                        styles.returnBadge,
                        doc.return_status ? styles.returnedBadge : styles.notReturnedBadge,
                      ]}
                      onPress={() => toggleReturnStatus(doc.id, doc.return_status)}
                    >
                      <Text
                        style={[
                          styles.returnText,
                          doc.return_status ? styles.returnedText : styles.notReturnedText,
                        ]}
                      >
                        {doc.return_status ? '✓ Returned' : '⚠ Pending'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.docBadgesRow}>
                    <TouchableOpacity
                      style={[
                        styles.statusBadge,
                        doc.status === 'pending' && styles.pendingBadge,
                        doc.status === 'submitted' && styles.submittedBadge,
                      ]}
                      onPress={() => toggleDocumentStatus(doc.id, doc.status)}
                    >
                      <Text style={styles.statusText}>{doc.status.toUpperCase()}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.accountingBadge,
                        doc.uploaded_to_accounting && styles.accountingUploadedBadge,
                      ]}
                      onPress={() => toggleAccountingUpload(doc.id, doc.uploaded_to_accounting)}
                    >
                      <MaterialIcons
                        name={doc.uploaded_to_accounting ? 'cloud-done' : 'cloud-off'}
                        size={14}
                        color={doc.uploaded_to_accounting ? '#10b981' : '#9ca3af'}
                      />
                      <Text
                        style={[
                          styles.accountingText,
                          doc.uploaded_to_accounting && styles.accountingUploadedText,
                        ]}
                      >
                        {doc.uploaded_to_accounting ? 'Uploaded ✓' : 'Not Uploaded'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {doc.storage_location && (
                  <View style={styles.docInfo}>
                    <MaterialIcons name="folder" size={14} color="#6b7280" />
                    <Text style={styles.docInfoText}>Storage: {doc.storage_location}</Text>
                  </View>
                )}
                {doc.softcopy_location && (
                  <View style={styles.docInfo}>
                    <MaterialIcons name="computer" size={14} color="#6b7280" />
                    <Text style={styles.docInfoText}>Softcopy: {doc.softcopy_location}</Text>
                  </View>
                )}
                {doc.last_entry_date && (
                  <View style={styles.docInfo}>
                    <MaterialIcons name="event" size={14} color="#6b7280" />
                    <Text style={styles.docInfoText}>Last Entry: {doc.last_entry_date}</Text>
                  </View>
                )}

                <View style={styles.docHint}>
                  <Text style={styles.docHintText}>Tap to edit • Long press to delete</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Document Modal */}
      <Modal
        visible={docModalVisible || editDocModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setDocModalVisible(false);
          setEditDocModalVisible(false);
          setEditingDoc(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editDocModalVisible ? 'Edit Document' : 'Add Document'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDocModalVisible(false);
                  setEditDocModalVisible(false);
                  setEditingDoc(null);
                  resetDocForm();
                }}
              >
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Document Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter document name"
                value={docFormData.doc_name}
                onChangeText={(text) => setDocFormData({ ...docFormData, doc_name: text })}
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusPicker}>
                {['pending', 'submitted'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      docFormData.status === status && styles.statusOptionActive,
                    ]}
                    onPress={() => setDocFormData({ ...docFormData, status })}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        docFormData.status === status && styles.statusOptionTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Physical Storage Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Cabinet A, Shelf 2"
                value={docFormData.storage_location}
                onChangeText={(text) =>
                  setDocFormData({ ...docFormData, storage_location: text })
                }
              />

              <Text style={styles.inputLabel}>Softcopy Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., D:/Clients/ABC Ltd/"
                value={docFormData.softcopy_location}
                onChangeText={(text) =>
                  setDocFormData({ ...docFormData, softcopy_location: text })
                }
              />

              <Text style={styles.inputLabel}>Last Entry Date in Accounting Software</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="event" size={20} color="#6b7280" />
                <Text style={[styles.dateInputText, !docFormData.last_entry_date && styles.placeholderText]}>
                  {docFormData.last_entry_date || 'Tap to select date'}
                </Text>
                {docFormData.last_entry_date && (
                  <TouchableOpacity
                    onPress={() => setDocFormData({ ...docFormData, last_entry_date: '' })}
                  >
                    <MaterialIcons name="clear" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={docFormData.last_entry_date ? new Date(docFormData.last_entry_date) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() =>
                  setDocFormData({
                    ...docFormData,
                    uploaded_to_accounting: !docFormData.uploaded_to_accounting,
                  })
                }
              >
                <MaterialIcons
                  name={docFormData.uploaded_to_accounting ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color="#1e3a8a"
                />
                <Text style={styles.checkboxLabel}>Uploaded to System</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() =>
                  setDocFormData({
                    ...docFormData,
                    return_status: !docFormData.return_status,
                  })
                }
              >
                <MaterialIcons
                  name={docFormData.return_status ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color="#10b981"
                />
                <Text style={styles.checkboxLabel}>Document Returned to Client</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setDocModalVisible(false);
                  setEditDocModalVisible(false);
                  setEditingDoc(null);
                  resetDocForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={editDocModalVisible ? handleUpdateDocument : handleCreateDocument}
              >
                <Text style={styles.submitButtonText}>
                  {editDocModalVisible ? 'Update' : 'Add Document'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        visible={editClientModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditClientModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Client</Text>
              <TouchableOpacity onPress={() => setEditClientModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Firm Name *</Text>
              <TextInput
                style={styles.input}
                value={clientFormData.firm_name}
                onChangeText={(text) => setClientFormData({ ...clientFormData, firm_name: text })}
              />

              <Text style={styles.inputLabel}>Owner Name *</Text>
              <TextInput
                style={styles.input}
                value={clientFormData.owner_name}
                onChangeText={(text) => setClientFormData({ ...clientFormData, owner_name: text })}
              />

              <Text style={styles.inputLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={clientFormData.mobile}
                onChangeText={(text) => setClientFormData({ ...clientFormData, mobile: text })}
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                value={clientFormData.email}
                onChangeText={(text) => setClientFormData({ ...clientFormData, email: text })}
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                value={clientFormData.address}
                onChangeText={(text) => setClientFormData({ ...clientFormData, address: text })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditClientModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleUpdateClient}>
                <Text style={styles.submitButtonText}>Update Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Message Modal */}
      <Modal
        visible={messageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMessageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Message</Text>
              <TouchableOpacity onPress={() => setMessageModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {aiLoading ? (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="large" color="#1e3a8a" />
                  <Text style={styles.aiLoadingText}>AI is generating message...</Text>
                </View>
              ) : (
                <View style={styles.messageContainer}>
                  <Text style={styles.copyHint}>📋 Ready to copy and share via WhatsApp</Text>
                  <Text style={styles.messageText} selectable>
                    {generatedMessage}
                  </Text>
                </View>
              )}
            </ScrollView>

            {!aiLoading && generatedMessage && (
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.shareButton} onPress={shareMessage}>
                  <MaterialIcons name="share" size={20} color="#ffffff" />
                  <Text style={styles.shareButtonText}>Share via WhatsApp</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Cheatsheet Modal */}
      <Modal
        visible={cheatsheetModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheatsheetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Document Cheatsheet</Text>
              <TouchableOpacity onPress={() => setCheatsheetModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {aiLoading ? (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="large" color="#1e3a8a" />
                  <Text style={styles.aiLoadingText}>AI is generating cheatsheet...</Text>
                </View>
              ) : (
                <View style={styles.messageContainer}>
                  <Text style={styles.copyHint}>📋 Ready to copy and share</Text>
                  <Text style={styles.cheatsheetText} selectable>
                    {cheatsheetContent}
                  </Text>
                </View>
              )}
            </ScrollView>

            {!aiLoading && cheatsheetContent && (
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.shareButton} onPress={shareCheatsheet}>
                  <MaterialIcons name="share" size={20} color="#ffffff" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* Bulk Docs Import Modal */}
      <Modal
        visible={bulkDocsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBulkDocsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Import Documents</Text>
              <TouchableOpacity onPress={() => { setBulkDocsModalVisible(false); setDocsCsvText(''); }}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.csvInfoBox}>
                <MaterialIcons name="info-outline" size={18} color="#1e3a8a" />
                <View style={styles.csvInfoContent}>
                  <Text style={styles.csvInfoTitle}>CSV Format for {client.firm_name}</Text>
                  <Text style={styles.csvInfoText}>
                    Required: doc_name{'\n'}
                    Optional: status (pending/submitted), storage_location, softcopy_location, last_entry_date, uploaded_to_accounting (true/false)
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.pickFileButton}
                onPress={pickDocsCsvFile}
              >
                <MaterialCommunityIcons name="file-document-outline" size={24} color="#1e3a8a" />
                <Text style={styles.pickFileButtonText}>Pick CSV File</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Or Paste CSV Data</Text>
              <TextInput
                style={[styles.input, styles.csvTextArea]}
                placeholder="doc_name,status,storage_location,uploaded_to_accounting&#10;PAN Card,submitted,Cabinet A,true&#10;Bank Statement,pending,,false"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={10}
                value={docsCsvText}
                onChangeText={setDocsCsvText}
              />

              {docsCsvText.length > 0 && (
                <Text style={styles.csvPreviewText}>
                  {docsCsvText.split('\n').filter(l => l.trim()).length} rows detected
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setBulkDocsModalVisible(false); setDocsCsvText(''); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, bulkLoading && { opacity: 0.7 }]}
                onPress={handleBulkDocsImport}
                disabled={bulkLoading}
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
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f3f4f6', padding: 32,
  },
  errorText: { fontSize: 20, fontWeight: '600', color: '#6b7280', marginTop: 16 },
  backButton: {
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: '#1e3a8a', borderRadius: 8,
  },
  backButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  headerSafe: { backgroundColor: '#1e3a8a' },
  header: {
    backgroundColor: '#1e3a8a', padding: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  backIcon: { marginRight: 12 },
  headerLogo: {
    width: 40, height: 40, marginRight: 12,
    backgroundColor: '#ffffff', borderRadius: 8, padding: 4,
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 16, color: '#ffffff', fontWeight: '600', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 18, color: '#ffffff', fontWeight: 'bold', marginTop: 2 },
  scrollView: { flex: 1 },
  clientCard: {
    backgroundColor: '#ffffff', margin: 16, padding: 16, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  clientCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  clientCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  editButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#eff6ff', borderRadius: 16, gap: 4,
  },
  editButtonText: { fontSize: 13, color: '#1e3a8a', fontWeight: '600' },
  clientRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  clientLabel: { fontSize: 14, color: '#6b7280', marginLeft: 8, width: 70 },
  clientValue: { fontSize: 14, color: '#1f2937', fontWeight: '600', flex: 1 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 12 },
  statBox: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  pendingBox: { backgroundColor: '#fed7aa' },
  submittedBox: { backgroundColor: '#d1fae5' },
  totalBox: { backgroundColor: '#dbeafe' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  aiActionsCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginBottom: 16,
    padding: 16, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  aiButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  aiButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#1e3a8a', backgroundColor: '#eff6ff', gap: 8,
  },
  aiButtonText: { fontSize: 14, fontWeight: '600', color: '#1e3a8a' },
  documentsSection: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  sectionActions: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  bulkDocsIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
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
  emptyState: {
    backgroundColor: '#ffffff', padding: 48, borderRadius: 12, alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
  emptySubtext: { fontSize: 13, color: '#d1d5db', marginTop: 4 },
  docCard: {
    backgroundColor: '#ffffff', padding: 14, borderRadius: 12, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  docHeader: { marginBottom: 8 },
  docTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  docName: { fontSize: 16, fontWeight: '600', color: '#1f2937', flex: 1, marginRight: 8 },
  returnBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  returnedBadge: { backgroundColor: '#d1fae5' },
  notReturnedBadge: { backgroundColor: '#fee2e2' },
  returnText: { fontSize: 11, fontWeight: '600' },
  returnedText: { color: '#10b981' },
  notReturnedText: { color: '#ef4444' },
  docBadgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  pendingBadge: { backgroundColor: '#fed7aa' },
  submittedBadge: { backgroundColor: '#d1fae5' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#1f2937' },
  accountingBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#f3f4f6', gap: 4,
  },
  accountingUploadedBadge: { backgroundColor: '#ecfdf5' },
  accountingText: { fontSize: 10, fontWeight: '600', color: '#6b7280' },
  accountingUploadedText: { color: '#10b981' },
  docInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  docInfoText: { fontSize: 12, color: '#6b7280', marginLeft: 6 },
  docHint: {
    marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  docHintText: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },
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
  dateInput: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 8, padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 12,
  },
  dateInputText: { flex: 1, fontSize: 16, color: '#1f2937' },
  placeholderText: { color: '#9ca3af' },
  statusPicker: { flexDirection: 'row', gap: 8 },
  statusOption: {
    flex: 1, padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#d1d5db',
    alignItems: 'center', backgroundColor: '#ffffff',
  },
  statusOptionActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  statusOptionText: { fontSize: 14, color: '#6b7280', textTransform: 'capitalize' },
  statusOptionTextActive: { color: '#ffffff', fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  checkboxLabel: { fontSize: 14, color: '#374151', marginLeft: 8, flex: 1 },
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
  aiLoadingContainer: { alignItems: 'center', paddingVertical: 48 },
  aiLoadingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },
  messageContainer: { padding: 4 },
  copyHint: {
    fontSize: 13, color: '#10b981', fontWeight: '600',
    marginBottom: 12, padding: 8, backgroundColor: '#ecfdf5', borderRadius: 6,
  },
  messageText: {
    fontSize: 15, lineHeight: 24, color: '#374151',
    backgroundColor: '#f9fafb', padding: 12, borderRadius: 8,
  },
  cheatsheetText: {
    fontSize: 13, lineHeight: 20, color: '#374151',
    backgroundColor: '#f9fafb', padding: 12, borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  shareButton: {
    flex: 1, flexDirection: 'row', padding: 16, borderRadius: 8,
    backgroundColor: '#25d366', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  shareButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});
