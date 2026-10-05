import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/fareCalculator';
import { formatDate } from '../../utils/formatters';
import { getDriverTripHistory } from '../../api/rides';
import { getDriverEarningsSummary } from '../../api/drivers';
import { supabase } from '../../api/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  DriverStackParamList,
  DriverTabParamList,
  Ride,
} from '../../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<DriverTabParamList, 'DriverEarnings'>,
  NativeStackScreenProps<DriverStackParamList>
>;

import { SidebarDrawer } from '../../components/common/SidebarDrawer';

import { useTheme } from '../../hooks/useTheme';

export const DriverEarningsScreen: React.FC<any> = ({ navigation }) => {
  const driver = useAuthStore((s) => s.driver);
  const { colors } = useTheme();
  const [rides, setRides] = useState<Ride[]>([]);
  const [summary, setSummary] = useState({
    todayTotal: 0,
    todayTrips: 0,
    weekTotal: 0,
    allTimeTotal: 0,
    totalTrips: 0,
  });
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchEarningsData = async () => {
    if (!driver?.driver_id) return;
    try {
      setLoading(true);
      const [historyData, summaryData] = await Promise.all([
        getDriverTripHistory(driver.driver_id),
        getDriverEarningsSummary(driver.driver_id),
      ]);
      setRides(historyData);
      setSummary(summaryData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!driver?.driver_id) return;

    fetchEarningsData();

    // Realtime channel for rides & payments update
    const channel = supabase
      .channel(`driver_earnings_screen_${driver.driver_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${driver.driver_id}`,
        },
        () => {
          fetchEarningsData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
        },
        () => {
          fetchEarningsData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [driver?.driver_id]);

  const handleOpenTripRoute = (rideId: string) => {
    navigation.navigate('ActiveTrip', { rideId });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="Earnings & Trip History"
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
        onRefresh={fetchEarningsData}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Overview Stats Cards */}
            <Card style={styles.mainEarningsCard}>
              <Text style={styles.mainLabel}>Today's Cash Collected</Text>
              <Text style={styles.mainValue}>{formatCurrency(summary.todayTotal)}</Text>
              <Text style={styles.mainSubtext}>{summary.todayTrips} trips completed today</Text>
            </Card>

            <View style={styles.subStatsRow}>
              <Card style={styles.subStatCard}>
                <Text style={styles.subStatLabel}>This Week</Text>
                <Text style={styles.subStatValue}>{formatCurrency(summary.weekTotal)}</Text>
              </Card>

              <Card style={styles.subStatCard}>
                <Text style={styles.subStatLabel}>All Time Volume</Text>
                <Text style={styles.subStatValue}>{formatCurrency(summary.allTimeTotal)}</Text>
              </Card>
            </View>

            <Text style={styles.sectionTitle}>Completed Trip Logs (Tap to view route)</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenTripRoute(item.ride_id)}
          >
            <Card style={styles.rideItem}>
              <View style={styles.rideHeader}>
                <Text style={styles.rideDate}>{formatDate(item.requested_at)}</Text>
                <Text style={styles.rideFare}>{formatCurrency(Number(item.fare))}</Text>
              </View>

              <View style={styles.routeDetails}>
                <Text style={styles.routeText} numberOfLines={1}>
                  🟢 {item.pickup_address}
                </Text>
                <Text style={styles.routeText} numberOfLines={1}>
                  🔴 {item.dropoff_address}
                </Text>
              </View>

              <View style={styles.rideFooter}>
                <Text style={styles.passengerCount}>👥 {item.passenger_count} Passenger(s)</Text>
                <View style={styles.viewRouteBadge}>
                  <Text style={styles.viewRouteText}>🗺️ View Route →</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No completed trips yet"
              description="Complete ride requests to build your daily tricycle earnings log."
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  mainEarningsCard: {
    backgroundColor: colors.primaryDark,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mainLabel: {
    ...typography.captionBold,
    color: colors.primaryLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mainValue: {
    ...typography.heading1,
    color: colors.white,
    fontSize: 34,
    marginVertical: spacing.xs,
  },
  mainSubtext: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
  },
  subStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  subStatCard: {
    flex: 1,
    padding: spacing.md,
  },
  subStatLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  subStatValue: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: spacing.xs,
    marginLeft: 4,
  },
  rideItem: {
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
  rideFare: {
    ...typography.heading3,
    color: colors.primaryDark,
  },
  routeDetails: {
    marginVertical: spacing.xs,
  },
  routeText: {
    ...typography.body,
    color: colors.textPrimary,
    marginVertical: 1,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  viewRouteBadge: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  viewRouteText: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  passengerCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cashCollected: {
    ...typography.captionBold,
    color: colors.success,
  },
});
