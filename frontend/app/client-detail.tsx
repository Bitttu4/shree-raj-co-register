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
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

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
  status: 'required' | 'submitted' | 'pending';
  storage_location?: string;
  softcopy_location?: string;
  return_status: boolean;
  deadline_date?: string;
  created_at: string;
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams();
  const [client, setClient] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [cheatsheetModalVisible, setCheatsheetModalVisible] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [cheatsheetContent, setCheatsheetContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [docFormData, setDocFormData] = useState({
    doc_name: '',
    status: 'required',
    storage_location: '',
    softcopy_location: '',
    return_status: false,
    deadline_date: '',
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
        Alert.alert('Success', 'Document added successfully');
        setDocModalVisible(false);
        setDocFormData({
          doc_name: '',
          status: 'required',
          storage_location: '',
          softcopy_location: '',
          return_status: false,
          deadline_date: '',
        });
        fetchClientData();
      } else {
        Alert.alert('Error', 'Failed to add document');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      Alert.alert('Error', 'Failed to add document');
    }
  };

  const toggleDocumentStatus = async (docId: string, currentStatus: string) => {
    const statusCycle = { required: 'pending', pending: 'submitted', submitted: 'required' };
    const newStatus = statusCycle[currentStatus as keyof typeof statusCycle];

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

      if (!response.ok) {
        throw new Error('Failed to generate message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let message = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              const content = line.slice(6);
              message += content;
              setGeneratedMessage(message);
            }
          }
        }
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
      await Share.share({
        message: generatedMessage,
        title: `Message for ${client?.firm_name}`,
      });
    } catch (error) {
      console.error('Error sharing message:', error);
    }
  };

  const shareCheatsheet = async () => {
    try {
      await Share.share({
        message: cheatsheetContent,
        title: `Document Cheatsheet - ${client?.firm_name}`,
      });
    } catch (error) {
      console.error('Error sharing cheatsheet:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClientData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
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

  const requiredDocs = documents.filter((d) => d.status === 'required');
  const submittedDocs = documents.filter((d) => d.status === 'submitted');
  const pendingDocs = documents.filter((d) => d.status === 'pending');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>SHREE RAJ & CO</Text>
          <Text style={styles.headerSubtitle}>{client.firm_name}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Client Info Card */}
        <View style={styles.clientCard}>
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
        </View>

        {/* Document Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, styles.requiredBox]}>
            <Text style={styles.statNumber}>{requiredDocs.length}</Text>
            <Text style={styles.statLabel}>Required</Text>
          </View>
          <View style={[styles.statBox, styles.pendingBox]}>
            <Text style={styles.statNumber}>{pendingDocs.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statBox, styles.submittedBox]}>
            <Text style={styles.statNumber}>{submittedDocs.length}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
        </View>

        {/* AI Actions */}
        <View style={styles.aiActionsCard}>
          <Text style={styles.sectionTitle}>AI-Powered Actions</Text>
          <View style={styles.aiButtonsRow}>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={generateClientMessage}
            >
              <MaterialIcons name="message" size={20} color="#2563eb" />
              <Text style={styles.aiButtonText}>Generate Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiButton} onPress={generateCheatsheet}>
              <MaterialCommunityIcons name="file-document" size={20} color="#2563eb" />
              <Text style={styles.aiButtonText}>Cheatsheet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Documents List */}
        <View style={styles.documentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <TouchableOpacity onPress={() => setDocModalVisible(true)}>
              <MaterialIcons name="add-circle" size={28} color="#2563eb" />
            </TouchableOpacity>
          </View>

          {documents.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="description" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No documents added yet</Text>
            </View>
          ) : (
            documents.map((doc) => (
              <View key={doc.id} style={styles.docCard}>
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
                        {doc.return_status ? 'Returned' : 'Pending'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.statusBadge,
                      doc.status === 'required' && styles.requiredBadge,
                      doc.status === 'pending' && styles.pendingBadge,
                      doc.status === 'submitted' && styles.submittedBadge,
                    ]}
                    onPress={() => toggleDocumentStatus(doc.id, doc.status)}
                  >
                    <Text style={styles.statusText}>{doc.status.toUpperCase()}</Text>
                  </TouchableOpacity>
                </View>

                {doc.storage_location && (
                  <View style={styles.docInfo}>
                    <MaterialIcons name="folder" size={16} color="#6b7280" />
                    <Text style={styles.docInfoText}>Storage: {doc.storage_location}</Text>
                  </View>
                )}
                {doc.softcopy_location && (
                  <View style={styles.docInfo}>
                    <MaterialIcons name="computer" size={16} color="#6b7280" />
                    <Text style={styles.docInfoText}>Softcopy: {doc.softcopy_location}</Text>
                  </View>
                )}
                {doc.deadline_date && (
                  <View style={styles.docInfo}>
                    <MaterialIcons name="event" size={16} color="#6b7280" />
                    <Text style={styles.docInfoText}>Deadline: {doc.deadline_date}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Document Modal */}
      <Modal
        visible={docModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDocModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Document</Text>
              <TouchableOpacity onPress={() => setDocModalVisible(false)}>
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
                {['required', 'pending', 'submitted'].map((status) => (
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

              <Text style={styles.inputLabel}>Storage Location (Physical)</Text>
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

              <Text style={styles.inputLabel}>Deadline Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={docFormData.deadline_date}
                onChangeText={(text) => setDocFormData({ ...docFormData, deadline_date: text })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDocModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleCreateDocument}>
                <Text style={styles.submitButtonText}>Add Document</Text>
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
              <Text style={styles.modalTitle}>Generated Message</Text>
              <TouchableOpacity onPress={() => setMessageModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {aiLoading ? (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.aiLoadingText}>AI is generating message...</Text>
                </View>
              ) : (
                <Text style={styles.messageText}>{generatedMessage}</Text>
              )}
            </ScrollView>

            {!aiLoading && generatedMessage && (
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.shareButton} onPress={shareMessage}>
                  <MaterialIcons name="share" size={20} color="#ffffff" />
                  <Text style={styles.shareButtonText}>Share</Text>
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
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.aiLoadingText}>AI is generating cheatsheet...</Text>
                </View>
              ) : (
                <Text style={styles.cheatsheetText}>{cheatsheetContent}</Text>
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
    </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  clientCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    width: 70,
  },
  clientValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  requiredBox: {
    backgroundColor: '#fef3c7',
  },
  pendingBox: {
    backgroundColor: '#fed7aa',
  },
  submittedBox: {
    backgroundColor: '#d1fae5',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  aiActionsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    gap: 8,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  documentsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  docCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  docHeader: {
    marginBottom: 12,
  },
  docTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  returnBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  returnedBadge: {
    backgroundColor: '#d1fae5',
  },
  notReturnedBadge: {
    backgroundColor: '#fee2e2',
  },
  returnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  returnedText: {
    color: '#10b981',
  },
  notReturnedText: {
    color: '#ef4444',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  requiredBadge: {
    backgroundColor: '#fef3c7',
  },
  pendingBadge: {
    backgroundColor: '#fed7aa',
  },
  submittedBadge: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  docInfoText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  statusPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  statusOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  statusOptionTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  aiLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  aiLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
  },
  cheatsheetText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
