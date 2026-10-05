import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../types';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatCurrency } from '../../utils/fareCalculator';
import { getAdminOverviewStats } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import { SidebarDrawer } from '../../components/common/SidebarDrawer';

import { useTheme } from '../../hooks/useTheme';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminDashboard'>;

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, signOut } = useAuthStore();
  const { colors } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    totalRides: 0,
    totalFareVolume: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getAdminOverviewStats();
      setStats(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Log out of Admin console?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="MTDA Admin Console"
        subtitle="Makilala Tricycle Booking Oversight"
        onMenu={() => setSidebarOpen(true)}
      />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <View style={styles.mainContainer}>
        {/* Welcome Card */}
        <Card style={styles.adminCard}>
          <Text style={styles.badge}>ADMINISTRATOR PRIVILEGES</Text>
          <Text style={styles.adminTitle}>System Overview</Text>
          <Text style={styles.adminSubtitle}>
            Live platform metrics for MTDA
          </Text>
        </Card>

        {/* 2x2 Metric Grid */}
        <View style={styles.grid}>
          <Card style={styles.gridCard}>
            <Text style={styles.metricLabel}>Total Fare Volume</Text>
            <Text style={styles.metricValue}>{formatCurrency(stats.totalFareVolume)}</Text>
            <Text style={styles.metricSub}>Completed cash rides</Text>
          </Card>

          <Card style={styles.gridCard}>
            <Text style={styles.metricLabel}>Total Rides Logged</Text>
            <Text style={styles.metricValue}>{stats.totalRides}</Text>
            <Text style={styles.metricSub}>All booking requests</Text>
          </Card>

          <Card style={styles.gridCard}>
            <Text style={styles.metricLabel}>Registered Drivers</Text>
            <Text style={styles.metricValue}>{stats.totalDrivers}</Text>
            <Text style={styles.metricSub}>Tricycle operators</Text>
          </Card>

          <Card style={styles.gridCard}>
            <Text style={styles.metricLabel}>Total App Users</Text>
            <Text style={styles.metricValue}>{stats.totalUsers}</Text>
            <Text style={styles.metricSub}>Passengers & drivers</Text>
          </Card>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContainer: {
    flex: 1,
    padding: spacing.md,
  },
  logoutText: {
    ...typography.captionBold,
    color: colors.danger,
  },
  adminCard: {
    backgroundColor: colors.primaryDark,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  badge: {
    ...typography.captionBold,
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  adminTitle: {
    ...typography.heading2,
    color: colors.white,
    marginTop: 2,
  },
  adminSubtitle: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  gridCard: {
    width: '47.5%',
    padding: spacing.md,
    marginBottom: 0,
  },
  metricLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  metricValue: {
    ...typography.heading2,
    color: colors.primaryDark,
    marginTop: 4,
  },
  metricSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 10,
  },
  sectionHeader: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: spacing.sm,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionDetails: {
    flex: 1,
  },
  actionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  actionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionChevron: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
});
