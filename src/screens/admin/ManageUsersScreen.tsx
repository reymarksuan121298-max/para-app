import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { FormInput } from '../../components/common/FormInput';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { getAllUsers, updateUserStatus, adminCreateUser, updateUserRole } from '../../api/admin';
import { UserProfile, UserRole } from '../../types';
import { formatDate } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';
import { SidebarDrawer } from '../../components/common/SidebarDrawer';
import { useTheme } from '../../hooks/useTheme';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import {
  zodResolver,
  adminCreateUserSchema,
  AdminCreateUserFormData,
} from '../../utils/validators';

export const ManageUsersScreen: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filterRole, setFilterRole] = useState<'all' | 'passenger' | 'driver' | 'admin'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<AdminCreateUserFormData>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'passenger',
      license_number: '',
      vehicle_number: '',
      seat_capacity: 6,
    },
    mode: 'onBlur',
  });

  const selectedRole = watch('role');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAddModal = () => {
    reset({
      name: '',
      email: '',
      phone: '',
      role: 'passenger',
      license_number: '',
      vehicle_number: '',
      seat_capacity: 6,
    });
    setSubmitError(null);
    setShowAddModal(true);
  };

  const handleCreateUser = handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      await adminCreateUser({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        role: values.role,
        license_number: values.license_number?.trim(),
        vehicle_number: values.vehicle_number?.trim(),
        seat_capacity: values.seat_capacity ? Number(values.seat_capacity) : 6,
      });

      setShowAddModal(false);
      Alert.alert(
        'User Created',
        `Account for ${values.name} (${values.role.toUpperCase()}) was successfully created.`
      );
      await fetchUsers();
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to create user account'));
    } finally {
      setSubmitting(false);
    }
  });

  const handleToggleStatus = (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    Alert.alert(
      `${nextStatus === 'active' ? 'Activate' : 'Suspend'} User`,
      `Are you sure you want to ${nextStatus === 'active' ? 'activate' : 'suspend'} ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: nextStatus === 'suspended' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateUserStatus(user.user_id, nextStatus);
              await fetchUsers();
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err, 'Failed to update user status'));
            }
          },
        },
      ]
    );
  };

  const handleToggleRole = (user: UserProfile) => {
    const isCurrentlyAdmin = user.role === 'admin';
    const targetRole: UserRole = isCurrentlyAdmin ? 'passenger' : 'admin';

    Alert.alert(
      isCurrentlyAdmin ? 'Revoke Admin Privileges' : 'Promote to Administrator',
      isCurrentlyAdmin
        ? `Demote ${user.name} from Administrator to Passenger?`
        : `Grant full Administrator permissions to ${user.name}? They will be able to manage fares, locations, and users.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isCurrentlyAdmin ? 'Demote' : 'Promote',
          style: isCurrentlyAdmin ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateUserRole(user.user_id, targetRole);
              await fetchUsers();
              Alert.alert('Role Updated', `${user.name} is now a ${targetRole.toUpperCase()}.`);
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err, 'Failed to update user role'));
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search));
    return matchesRole && matchesSearch;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="User Management"
        onMenu={() => setSidebarOpen(true)}
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleOpenAddModal}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+ Add User</Text>
          </TouchableOpacity>
        }
      />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <View style={styles.content}>
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Text>🔍</Text>}
        />

        {/* Role Tabs */}
        <View style={styles.tabsRow}>
          {(['all', 'passenger', 'driver', 'admin'] as const).map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.tab, filterRole === role && styles.tabActive]}
              onPress={() => setFilterRole(role)}
            >
              <Text
                style={[
                  styles.tabText,
                  filterRole === role && styles.tabTextActive,
                ]}
              >
                {role.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.user_id}
          refreshing={loading}
          onRefresh={fetchUsers}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>Tap "+ Add User" above to create an account.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userHeaderLeft}>
                  <ProfileAvatar
                    size={46}
                    userId={item.user_id}
                    avatarUrl={item.avatar_url}
                    role={item.role}
                  />
                  <View style={styles.userMeta}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    {item.phone && <Text style={styles.userPhone}>📞 {item.phone}</Text>}
                  </View>
                </View>
                <Badge
                  label={item.role === 'admin' ? '🛡️ Admin' : item.role === 'driver' ? '🛺 Driver' : '👤 Passenger'}
                  variant={item.role === 'admin' ? 'info' : item.role === 'driver' ? 'warning' : 'primary'}
                />
              </View>

              <View style={styles.userFooter}>
                <View style={styles.statusBox}>
                  <Text style={styles.joinDate}>Joined {formatDate(item.created_at)}</Text>
                  <Text
                    style={[
                      styles.statusText,
                      item.status === 'active' ? styles.statusActive : styles.statusSuspended,
                    ]}
                  >
                    ● {item.status.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      item.role === 'admin' ? styles.demoteBtn : styles.promoteBtn,
                    ]}
                    onPress={() => handleToggleRole(item)}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        item.role === 'admin' ? styles.demoteBtnText : styles.promoteBtnText,
                      ]}
                    >
                      {item.role === 'admin' ? 'Demote' : 'Make Admin'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      item.status === 'active' ? styles.suspendBtn : styles.activateBtn,
                    ]}
                    onPress={() => handleToggleStatus(item)}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        item.status === 'active'
                          ? styles.suspendBtnText
                          : styles.activateBtnText,
                      ]}
                    >
                      {item.status === 'active' ? 'Suspend' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}
        />
      </View>

      {/* Add User Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New User</Text>
                <Text style={styles.modalSubtitle}>Create Passenger, Driver, or Admin account</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <ErrorBanner message={submitError} />

              {/* Role Selector Segment */}
              <Text style={styles.fieldLabel}>Select Account Role</Text>
              <View style={styles.rolePickerRow}>
                {(['passenger', 'driver', 'admin'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOption,
                      selectedRole === r && styles.roleOptionActive,
                    ]}
                    onPress={() => setValue('role', r)}
                  >
                    <Text style={styles.roleOptionIcon}>
                      {r === 'passenger' ? '👤' : r === 'driver' ? '🛺' : '🛡️'}
                    </Text>
                    <Text
                      style={[
                        styles.roleOptionText,
                        selectedRole === r && styles.roleOptionTextActive,
                      ]}
                    >
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FormInput
                control={control}
                name="name"
                label="Full Name"
                placeholder="e.g. Maria Santos"
              />

              <FormInput
                control={control}
                name="email"
                label="Email Address"
                placeholder="e.g. maria@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <FormInput
                control={control}
                name="phone"
                label="Phone Number"
                placeholder="e.g. 09123456789"
                keyboardType="phone-pad"
              />

              {/* Driver-Specific Fields */}
              {selectedRole === 'driver' && (
                <View style={styles.driverSection}>
                  <Text style={styles.driverSectionTitle}>Driver & Vehicle Info</Text>

                  <FormInput
                    control={control}
                    name="license_number"
                    label="Driver's License Number"
                    placeholder="e.g. N01-12-345678"
                  />

                  <FormInput
                    control={control}
                    name="vehicle_number"
                    label="Tricycle Body / Plate Number"
                    placeholder="e.g. MKL-1234"
                  />

                  <Text style={styles.fieldLabel}>Seat Capacity</Text>
                  <View style={styles.capacityRow}>
                    {[5, 6, 7].map((cap) => (
                      <TouchableOpacity
                        key={cap}
                        style={[
                          styles.capBtn,
                          watch('seat_capacity') === cap && styles.capBtnActive,
                        ]}
                        onPress={() => setValue('seat_capacity', cap)}
                      >
                        <Text
                          style={[
                            styles.capBtnText,
                            watch('seat_capacity') === cap && styles.capBtnTextActive,
                          ]}
                        >
                          {cap} Seats
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowAddModal(false)}
                  style={styles.cancelBtn}
                />
                <Button
                  title="Create User"
                  onPress={handleCreateUser}
                  loading={submitting}
                  style={styles.submitBtn}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  addBtnText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.borderSubtle,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11,
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  userCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  userPhone: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  statusBox: {
    flex: 1,
  },
  joinDate: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  statusText: {
    ...typography.captionBold,
    fontSize: 11,
    marginTop: 2,
  },
  statusActive: {
    color: colors.success,
  },
  statusSuspended: {
    color: colors.danger,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  promoteBtn: {
    backgroundColor: '#EEF2FF',
  },
  demoteBtn: {
    backgroundColor: '#FEF3C7',
  },
  promoteBtnText: {
    ...typography.captionBold,
    color: '#4F46E5',
    fontSize: 11,
  },
  demoteBtnText: {
    ...typography.captionBold,
    color: '#D97706',
    fontSize: 11,
  },
  suspendBtn: {
    backgroundColor: colors.dangerBg,
  },
  activateBtn: {
    backgroundColor: colors.successBg,
  },
  actionBtnText: {
    ...typography.captionBold,
    fontSize: 11,
  },
  suspendBtnText: {
    color: colors.danger,
  },
  activateBtnText: {
    color: colors.success,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 1.5,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  modalScroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roleOption: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle || '#F0FDF4',
  },
  roleOptionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  roleOptionText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 10,
  },
  roleOptionTextActive: {
    color: colors.primaryDark,
  },
  driverSection: {
    backgroundColor: colors.borderSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  driverSectionTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  capacityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  capBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  capBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDark,
  },
  capBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  capBtnTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
