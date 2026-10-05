import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, spacing, Colors } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { FareEstimateResult } from '../../types';
import { formatCurrency } from '../../utils/fareCalculator';
import { Card } from '../common/Card';

interface FareBreakdownCardProps {
  estimate: FareEstimateResult;
}

export const FareBreakdownCard: React.FC<FareBreakdownCardProps> = ({ estimate }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Fare Breakdown</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Base Fare (First 2.0 km)</Text>
        <Text style={styles.value}>{formatCurrency(estimate.base_fare)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Distance Rate ({estimate.distance_km.toFixed(1)} km)</Text>
        <Text style={styles.value}>{formatCurrency(estimate.distance_fare)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Fare per Person</Text>
        <Text style={styles.value}>
          {formatCurrency(estimate.base_fare + estimate.distance_fare)}
        </Text>
      </View>

      {estimate.passenger_count > 1 && (
        <View style={styles.row}>
          <Text style={styles.label}>Passengers</Text>
          <Text style={styles.multiplierBadge}>
            × {estimate.passenger_count} passengers
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          Total ({estimate.passenger_count} {estimate.passenger_count === 1 ? 'passenger' : 'passengers'})
        </Text>
        <Text style={styles.totalValue}>{formatCurrency(estimate.total_fare)}</Text>
      </View>
      <Text style={styles.cashNotice}>💵 Cash payment directly to tricycle driver</Text>
    </Card>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  multiplierBadge: {
    ...typography.captionBold,
    color: colors.primary,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.heading2,
    color: colors.primaryDark,
  },
  cashNotice: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
