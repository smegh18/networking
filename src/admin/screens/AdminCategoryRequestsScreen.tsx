import React, { useEffect, useMemo, useState } from 'react';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminModal } from '../components/ui/AdminModal';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getAllCategoryRequests, updateCategoryRequest, deleteCategoryRequest } from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { CategoryRequest, BusinessConfig } from '../../types';
import { getBusinessConfigAdmin, updateBusinessConfigAdmin } from '../services/adminFirestore';

const styles = StyleSheet.create({
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    ...typography.bodySmall,
    color: colors.textInverse,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalMessage: {
    ...typography.bodySmall,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: ADMIN_LAYOUT.sectionGap,
  },
  detailScroll: {
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.text,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
});

type Props = StackScreenProps<AdminStackParamList, 'AdminCategoryRequests'>;

const AdminCategoryRequestsScreen: React.FC<Props> = () => {
  const [detailRequest, setDetailRequest] = useState<CategoryRequest | null>(null);
  const [deleteModal, setDeleteModal] = useState<CategoryRequest | null>(null);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [approveModal, setApproveModal] = useState<{ requestId: string; category: string } | null>(null);

  // Load business config (this doesn't need real-time updates)
  useEffect(() => {
    loadBusinessConfig();
  }, []);

  // Use real-time collection hook for category requests with sorting
  const { items: requestsItems, loading: requestsLoading } = useRealtimeCollection<
    CategoryRequest
  >('categoryRequests', 'id');

  // Convert items to requests and sort by createdAt descending (newest first)
  const requests = useMemo(() => {
    return [...requestsItems].sort((a, b) =>
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    );
  }, [requestsItems]);

  const loadBusinessConfig = async () => {
    try {
      setConfigLoading(true);
      const config = await getBusinessConfigAdmin();
      setBusinessConfig(config);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load business config.');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, category: string) => {
    if (!businessConfig) {
      Alert.alert('Error', 'Business config not loaded.');
      return;
    }

    try {
      // Add category to businessCategories if not already present
      const updatedCategories = Array.from(new Set([...businessConfig.businessCategories, category]));

      // Update business config
      await updateBusinessConfigAdmin({
        ...businessConfig,
        businessCategories: updatedCategories,
      });

      // Update request status to approved
      await updateCategoryRequest(requestId, {
        status: 'approved',
      });

      // Refresh business config to see the newly added category
      await loadBusinessConfig();

      Alert.alert('Success', 'Category approved and added to business categories.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to approve category request.');
    }
  };

  const handleRejectRequest = async (requestId: string, adminResponse: string) => {
    try {
      await updateCategoryRequest(requestId, {
        status: 'rejected',
        adminResponse,
      });

      Alert.alert('Success', 'Category request rejected.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to reject category request.');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteCategoryRequest(deleteModal.id);
      setDeleteModal(null);
      setDetailRequest(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete category request.');
    }
  };

  const formatDateTime = (value: string | number) =>
    new Date(value).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const columns = [
    { key: 'category', label: 'Category', sortable: true, width: 200 },
    { key: 'requestedByName', label: 'Requested By', sortable: true, width: 180 },
    { key: 'requestedByBusinessName', label: 'Business', width: 180 },
    { key: 'status', label: 'Status', sortable: true, width: 100 },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      width: 120,
      render: (item: CategoryRequest) => (
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
  ];

  return (
    <AdminLayout title="Category Requests" activeScreen="AdminCategoryRequests">
      <Text style={styles.subtitle}>{requests.length} category requests</Text>

      <AdminDataTable
        columns={columns}
        data={requests}
        keyExtractor={(item) => item.id}
        loading={requestsLoading}
        emptyMessage="No category requests found"
        onRowPress={(item) => setDetailRequest(item)}
      />

      {/* Request Detail Modal */}
      <AdminModal
        visible={!!detailRequest}
        title="Category Request Details"
        confirmLabel="Close"
        onConfirm={() => setDetailRequest(null)}
        onCancel={() => setDetailRequest(null)}
      >
        {detailRequest && (
          <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Requested Category</Text>
              <Text style={styles.detailValue}>{detailRequest.category}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Requested By</Text>
              <Text style={styles.detailValue}>{detailRequest.requestedByName}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Business</Text>
              <Text style={styles.detailValue}>{detailRequest.requestedByBusinessName}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>
                {detailRequest.status === 'pending' ? 'Pending Review' :
                 detailRequest.status === 'approved' ? 'Approved' : 'Rejected'}
              </Text>
            </View>
            {detailRequest.adminResponse && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Admin Response</Text>
                <Text style={styles.detailValue}>{detailRequest.adminResponse}</Text>
              </View>
            )}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Requested On</Text>
              <Text style={styles.detailValue}>{formatDateTime(detailRequest.createdAt)}</Text>
            </View>

            {detailRequest.status === 'pending' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => {
                    setApproveModal({ requestId: detailRequest.id, category: detailRequest.category });
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.buttonText}>Approve & Add to Categories</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => {
                    // In a real app, you might want to show a prompt for admin response
                    // For simplicity, we'll use a placeholder response
                    handleRejectRequest(detailRequest.id, 'Not suitable for our category list');
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.error} />
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            {detailRequest.status !== 'pending' && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setDeleteModal(detailRequest);
                  setDetailRequest(null);
                }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.deleteButtonText}>Delete Request</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </AdminModal>

      {/* Approve Modal */}
      <AdminModal
        visible={!!approveModal}
        title="Approve Category Request"
        message="Are you sure you want to approve this category and add it to the business categories list?"
        confirmLabel="Approve"
        confirmColor={colors.success}
        onConfirm={() => {
          if (approveModal) {
            handleApproveRequest(approveModal.requestId, approveModal.category);
            setApproveModal(null);
          }
        }}
        onCancel={() => setApproveModal(null)}
      >
        {approveModal && (
          <View style={styles.modalContent}>
            <Text style={styles.modalMessage}>Category: {approveModal.category}</Text>
          </View>
        )}
      </AdminModal>

      <AdminModal
        visible={!!deleteModal}
        title="Delete Category Request"
        message={`Are you sure you want to remove this category request for "${deleteModal?.category}"?`}
        confirmLabel="Delete"
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </AdminLayout>
  );
};

export default AdminCategoryRequestsScreen;