import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { borderRadius, typography, spacing, Colors } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { Ride } from '../../types';
import { RIDE_STATUS_COLORS, RIDE_STATUS_LABELS } from '../../utils/constants';
import { formatCurrency } from '../../utils/fareCalculator';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

interface RideStatusCardProps {
  ride: Ride;
  onCancel?: () => void;
  showDriverDetails?: boolean;
}

export const RideStatusCard: React.FC<RideStatusCardProps> = ({
  ride,
  showDriverDetails = true,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = RIDE_STATUS_COLORS[ride.status] || colors.primary;
  const statusLabel = RIDE_STATUS_LABELS[ride.status] || ride.status;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.statusIndicator}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={styles.fare}>{formatCurrency(Number(ride.fare))}</Text>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <Text style={styles.pointDot}>🟢</Text>
          <View style={styles.pointDetails}>
            <Text style={styles.pointLabel}>Pickup</Text>
            <Text style={styles.pointText} numberOfLines={1}>
              {ride.pickup_address}
            </Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <Text style={styles.pointDot}>🔴</Text>
          <View style={styles.pointDetails}>
            <Text style={styles.pointLabel}>Destination</Text>
            <Text style={styles.pointText} numberOfLines={1}>
              {ride.dropoff_address}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.passengersText}>👥 {ride.passenger_count} Passenger(s)</Text>
        {ride.estimated_distance_km && (
          <Text style={styles.distanceText}>📍 {ride.estimated_distance_km} km</Text>
        )}
      </View>

      {/* Driver info if assigned (only shown when not on driver's screen or when requested) */}
      {showDriverDetails && ride.driver && (
        <View style={styles.driverSection}>
          <View style={styles.driverAvatar}>
            <Text style={styles.avatarText}>🛺</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{ride.driver.user?.name || 'Tricycle Driver'}</Text>
            <Text style={styles.driverPlate}>
              Plate: {ride.driver.vehicle_number} • Capacity: {ride.driver.seat_capacity}
            </Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {ride.driver.rating_avg.toFixed(1)}</Text>
          </View>
        </View>
      )}
    </Card>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.captionBold,
    flex: 1,
  },
  fare: {
    ...typography.heading3,
    color: colors.primaryDark,
  },
  routeContainer: {
    marginVertical: spacing.xs,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pointDot: {
    fontSize: 12,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  pointDetails: {
    flex: 1,
  },
  pointLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  pointText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 6,
    marginVertical: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  passengersText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  distanceText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 20,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  driverPlate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  ratingBadge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  ratingText: {
    ...typography.captionBold,
    color: colors.secondaryDark,
  },
});
