import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { getAllUsers, updateUserStatus } from '../../api/admin';
import { UserProfile, UserRole } from '../../types';
import { formatDate } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';

import { SidebarDrawer } from '../../components/common/SidebarDrawer';
import { useTheme } from '../../hooks/useTheme';

export const ManageUsersScreen: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filterRole, setFilterRole] = useState<'all' | 'passenger' | 'driver'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
          {(['all', 'passenger', 'driver'] as const).map((role) => (
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
          renderItem={({ item }) => (
            <Card style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userMeta}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  {item.phone && <Text style={styles.userPhone}>📞 {item.phone}</Text>}
                </View>
                <Badge
                  label={item.role}
                  variant={item.role === 'driver' ? 'warning' : 'primary'}
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

                {item.role !== 'admin' && (
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
                )}
              </View>
            </Card>
          )}
        />
      </View>
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
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  suspendBtn: {
    backgroundColor: colors.dangerBg,
  },
  activateBtn: {
    backgroundColor: colors.successBg,
  },
  actionBtnText: {
    ...typography.captionBold,
  },
  suspendBtnText: {
    color: colors.danger,
  },
  activateBtnText: {
    color: colors.success,
  },
});
