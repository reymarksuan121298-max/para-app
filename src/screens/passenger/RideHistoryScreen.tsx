import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  PassengerStackParamList,
  PassengerTabParamList,
  Ride,
} from '../../types';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/fareCalculator';
import { formatDate } from '../../utils/formatters';
import { RIDE_STATUS_LABELS } from '../../utils/constants';
import { getPassengerRideHistory } from '../../api/rides';
import { useAuthStore } from '../../store/authStore';

import { SidebarDrawer } from '../../components/common/SidebarDrawer';

type Props = CompositeScreenProps<
  BottomTabScreenProps<PassengerTabParamList, 'RideHistory'>,
  NativeStackScreenProps<PassengerStackParamList>
>;

import { useTheme } from '../../hooks/useTheme';

export const RideHistoryScreen: React.FC<any> = ({ navigation }) => {
  const passenger = useAuthStore((s) => s.passenger);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchHistory = async () => {
    if (!passenger?.passenger_id) return;
    try {
      setLoading(true);
      const data = await getPassengerRideHistory(passenger.passenger_id);
      setRides(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [passenger?.passenger_id]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
      case 'accepted':
        return 'primary';
      case 'cancelled':
      case 'expired':
        return 'danger';
      default:
        return 'warning';
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="My Ride History"
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
        onRefresh={fetchHistory}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card
            style={styles.rideCard}
            onPress={() => {
              navigation.navigate('TrackRide', { rideId: item.ride_id });
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(item.requested_at)}</Text>
              <Badge
                label={RIDE_STATUS_LABELS[item.status] || item.status}
                variant={getStatusBadgeVariant(item.status)}
              />
            </View>

            {/* Route Points */}
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <Text style={styles.dot}>🟢</Text>
                <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.pickup_address}
                </Text>
              </View>
              <View style={styles.routePoint}>
                <Text style={styles.dot}>🔴</Text>
                <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.dropoff_address}
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
              <Text style={[styles.passengers, { color: colors.textSecondary }]}>👥 {item.passenger_count} Passenger(s)</Text>
              <Text style={[styles.fare, { color: colors.primaryDark }]}>{formatCurrency(Number(item.fare))}</Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No rides yet"
              description="Your completed and active tricycle trips in Makilala will appear here."
              actionTitle="Book a Ride"
              onAction={() => navigation.navigate('BookRide', {})}
            />
          ) : null
        }
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
  rideCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
  },
  routeContainer: {
    marginVertical: spacing.xs,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  dot: {
    fontSize: 10,
    marginRight: spacing.sm,
  },
  routeText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  passengers: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  fare: {
    ...typography.heading3,
    color: colors.primaryDark,
  },
});
