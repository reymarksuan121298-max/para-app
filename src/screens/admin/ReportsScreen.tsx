import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { getRideReports } from '../../api/admin';
import { Ride } from '../../types';
import { formatCurrency } from '../../utils/fareCalculator';
import { formatDate } from '../../utils/formatters';
import { RIDE_STATUS_LABELS } from '../../utils/constants';

import { SidebarDrawer } from '../../components/common/SidebarDrawer';
import { useTheme } from '../../hooks/useTheme';

export const ReportsScreen: React.FC = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await getRideReports({
        status: filterStatus === 'all' ? undefined : filterStatus,
      });
      setRides(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  // Aggregate metrics
  const totalVolume = rides
    .filter((r) => r.status === 'completed')
    .reduce((acc, r) => acc + (Number(r.fare) || 0), 0);

  const completedCount = rides.filter((r) => r.status === 'completed').length;
  const cancelledCount = rides.filter((r) => r.status === 'cancelled' || r.status === 'expired').length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="Ride & Revenue Reports"
        onMenu={() => setSidebarOpen(true)}
      />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <FlatList
        data={rides}
        keyExtractor={(item) => item.ride_id}
        refreshing={loading}
        onRefresh={fetchReports}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Top Revenue Summary */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Filtered Revenue</Text>
              <Text style={styles.summaryVolume}>{formatCurrency(totalVolume)}</Text>
              <View style={styles.summaryPills}>
                <Text style={styles.pillText}>✅ {completedCount} Completed</Text>
                <Text style={styles.pillText}>❌ {cancelledCount} Cancelled/Expired</Text>
              </View>
            </Card>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {['all', 'completed', 'in_progress', 'cancelled', 'expired'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterChip, filterStatus === st && styles.filterChipActive]}
                  onPress={() => setFilterStatus(st)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterStatus === st && styles.filterChipTextActive,
                    ]}
                  >
                    {st.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Ride Logs ({rides.length} records)</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.rideHeader}>
              <Text style={styles.rideDate}>{formatDate(item.requested_at)}</Text>
              <Badge
                label={RIDE_STATUS_LABELS[item.status] || item.status}
                variant={item.status === 'completed' ? 'success' : item.status === 'cancelled' ? 'danger' : 'primary'}
              />
            </View>

            <View style={styles.routeBox}>
              <Text style={styles.routeText} numberOfLines={1}>
                🟢 {item.pickup_address}
              </Text>
              <Text style={styles.routeText} numberOfLines={1}>
                🔴 {item.dropoff_address}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.partyText}>
                  👤 Passenger: {item.passenger?.user?.name || 'N/A'}
                </Text>
                {item.driver && (
                  <Text style={styles.partyText}>
                    🛺 Driver: {item.driver.user?.name || 'N/A'} ({item.driver.vehicle_number})
                  </Text>
                )}
              </View>
              <Text style={styles.fareAmount}>{formatCurrency(Number(item.fare))}</Text>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  headerSection: {
    marginBottom: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.primaryDark,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    ...typography.captionBold,
    color: colors.primaryLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryVolume: {
    ...typography.heading1,
    color: colors.white,
    fontSize: 32,
    marginVertical: spacing.xs,
  },
  summaryPills: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  pillText: {
    ...typography.captionBold,
    color: colors.white,
    opacity: 0.9,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: spacing.xs,
    marginLeft: 4,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rideDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  routeBox: {
    marginVertical: spacing.xs,
  },
  routeText: {
    ...typography.body,
    color: colors.textPrimary,
    marginVertical: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  partyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fareAmount: {
    ...typography.heading3,
    color: colors.primaryDark,
  },
});
