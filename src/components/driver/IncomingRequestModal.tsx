import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Vibration } from 'react-native';
import { borderRadius, typography, spacing, Colors } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { Ride } from '../../types';
import { formatCurrency } from '../../utils/fareCalculator';
import { formatSecondsToMinutes } from '../../utils/formatters';
import { Button } from '../common/Button';
import { DispatchSoundNotifier } from './DispatchSoundNotifier';

interface IncomingRequestModalProps {
  visible: boolean;
  ride: Ride | null;
  onAccept: (ride: Ride) => void;
  onDecline: (ride: Ride) => void;
}

/** Seconds a driver has to accept/decline before the request auto-declines. */
const REQUEST_TIMEOUT_SECONDS = 300;

export const IncomingRequestModal: React.FC<IncomingRequestModalProps> = ({
  visible,
  ride,
  onAccept,
  onDecline,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [timeLeft, setTimeLeft] = useState(REQUEST_TIMEOUT_SECONDS);
  const [accepting, setAccepting] = useState(false);

  // Keep the latest callback/ride reachable without putting them in the effect
  // deps: the parent re-creates the `ride` object on every realtime/polling
  // tick, and depending on it re-armed the countdown (stuck at 5:00), restarted
  // the vibration pattern and postponed auto-decline forever.
  const rideRef = useRef(ride);
  rideRef.current = ride;
  const onDeclineRef = useRef(onDecline);
  onDeclineRef.current = onDecline;

  // The countdown belongs to one ride request only.
  const rideId = ride?.ride_id ?? null;
  const remainingRef = useRef(REQUEST_TIMEOUT_SECONDS);

  useEffect(() => {
    if (!visible || !rideId) return;

    remainingRef.current = REQUEST_TIMEOUT_SECONDS;
    setTimeLeft(REQUEST_TIMEOUT_SECONDS);

    // Native haptic feedback matching the 2-second alert interval: [100ms vibrate, 50ms pause, 250ms vibrate]
    try {
      // [wait 0ms, vibrate 100ms, wait 50ms, vibrate 250ms, wait 1600ms]
      Vibration.vibrate([0, 100, 50, 250, 1600], true);
    } catch {
      // ignore
    }

    const timer = setInterval(() => {
      remainingRef.current -= 1;
      const remaining = remainingRef.current;
      setTimeLeft(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(timer);
        // Side effect stays outside the state updater so StrictMode cannot
        // invoke it twice.
        const currentRide = rideRef.current;
        if (currentRide) {
          onDeclineRef.current(currentRide);
        }
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      try {
        Vibration.cancel();
      } catch {
        // ignore
      }
    };
  }, [visible, rideId]);

  if (!visible || !ride) return null;

  const handleAccept = async () => {
    try {
      setAccepting(true);
      await onAccept(ride);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <DispatchSoundNotifier play={visible && !!ride} />
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header & Countdown */}
          <View style={styles.header}>
            <View>
              <Text style={styles.badge}>NEW RIDE REQUEST</Text>
              <Text style={styles.title}>Passenger Waiting</Text>
            </View>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>⏳ {formatSecondsToMinutes(timeLeft)}</Text>
            </View>
          </View>

          {/* Fare & Capacity Details */}
          <View style={styles.fareBanner}>
            <View>
              <Text style={styles.fareLabel}>Collect Fare</Text>
              <Text style={styles.fareAmount}>{formatCurrency(Number(ride.fare))}</Text>
            </View>
            <View style={styles.capacityBadge}>
              <Text style={styles.capacityText}>👥 {ride.passenger_count} Passenger(s)</Text>
            </View>
          </View>

          {/* Route Details */}
          <View style={styles.routeBox}>
            <View style={styles.routePoint}>
              <Text style={styles.dot}>🟢</Text>
              <View style={styles.pointDetails}>
                <Text style={styles.pointLabel}>PICKUP</Text>
                <Text style={styles.pointAddress}>{ride.pickup_address}</Text>
              </View>
            </View>

            <View style={styles.line} />

            <View style={styles.routePoint}>
              <Text style={styles.dot}>🔴</Text>
              <View style={styles.pointDetails}>
                <Text style={styles.pointLabel}>DESTINATION</Text>
                <Text style={styles.pointAddress}>{ride.dropoff_address}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <Button
              title="Decline"
              variant="outline"
              onPress={() => onDecline(ride)}
              style={styles.declineBtn}
            />
            <Button
              title="ACCEPT RIDE"
              variant="success"
              onPress={handleAccept}
              loading={accepting}
              style={styles.acceptBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    ...typography.captionBold,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  timerBadge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.secondaryLight,
  },
  timerText: {
    ...typography.bodyBold,
    color: colors.secondaryDark,
  },
  fareBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  fareLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fareAmount: {
    ...typography.heading1,
    color: colors.primaryDark,
  },
  capacityBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capacityText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  routeBox: {
    backgroundColor: colors.borderSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dot: {
    fontSize: 12,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  pointDetails: {
    flex: 1,
  },
  pointLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 10,
  },
  pointAddress: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  line: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 6,
    marginVertical: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  declineBtn: {
    flex: 1,
  },
  acceptBtn: {
    flex: 2,
  },
});
