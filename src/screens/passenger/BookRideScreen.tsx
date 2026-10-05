import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PassengerStackParamList, LocationItem } from '../../types';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LocationPickerModal } from '../../components/map/LocationPickerModal';
import { FareBreakdownCard } from '../../components/ride/FareBreakdownCard';
import { calculateFareEstimateClient } from '../../utils/fareCalculator';
import { calculateDistanceKm } from '../../utils/distance';
import { requestRide } from '../../api/rides';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { useFareSettings } from '../../hooks/useFareSettings';

import { Input } from '../../components/common/Input';
import { useTheme } from '../../hooks/useTheme';
import { getErrorMessage } from '../../utils/errors';

type Props = NativeStackScreenProps<PassengerStackParamList, 'BookRide'>;

export const BookRideScreen: React.FC<Props> = ({ navigation }) => {
  const passenger = useAuthStore((s) => s.passenger);
  const setActiveRide = useRideStore((s) => s.setActiveRide);
  const { settings: fareSettings } = useFareSettings();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [pickup, setPickup] = useState<LocationItem | null>(null);
  const [dropoff, setDropoff] = useState<LocationItem | null>(null);
  const [pickupLandmark, setPickupLandmark] = useState<string>('');
  const [passengerCount, setPassengerCount] = useState<number>(1);

  const [pickerMode, setPickerMode] = useState<'pickup' | 'dropoff' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute live fare estimate
  const fareEstimate =
    pickup && dropoff
      ? calculateFareEstimateClient(
          Number(pickup.latitude),
          Number(pickup.longitude),
          Number(dropoff.latitude),
          Number(dropoff.longitude),
          passengerCount,
          fareSettings
        )
      : null;

  const handleConfirmBooking = async () => {
    if (!pickup || !dropoff) {
      setError('Please select both pickup point and destination');
      return;
    }

    // Regional trip distance restriction (max 30 km for tricycle service)
    const tripDistKm = calculateDistanceKm(
      Number(pickup.latitude),
      Number(pickup.longitude),
      Number(dropoff.latitude),
      Number(dropoff.longitude)
    );

    if (tripDistKm > 30.0) {
      setError('Selected trip exceeds the local tricycle service region (Max 30 km). Please pick local points.');
      return;
    }

    if (!passenger?.passenger_id) {
      setError('Passenger profile not found. Please re-login.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Append landmark note to pickup address for the driver if provided
      const finalPickupAddress = pickupLandmark.trim()
        ? `${pickup.name || pickup.address} (Landmark: ${pickupLandmark.trim()})`
        : pickup.name || pickup.address;

      const newRide = await requestRide({
        passenger_id: passenger.passenger_id,
        pickup_lat: Number(pickup.latitude),
        pickup_lng: Number(pickup.longitude),
        pickup_address: finalPickupAddress,
        dropoff_lat: Number(dropoff.latitude),
        dropoff_lng: Number(dropoff.longitude),
        dropoff_address: dropoff.name || dropoff.address,
        passenger_count: passengerCount,
        pickup_location_id: pickup.location_id,
        dropoff_location_id: dropoff.location_id,
      });

      setActiveRide(newRide);
      navigation.replace('TrackRide', { rideId: newRide.ride_id });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit ride request'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Book a Tricycle" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ErrorBanner message={error} />

        {/* Route Selector Card */}
        <View style={[styles.routeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Pickup Selector */}
          <TouchableOpacity
            style={styles.locationSelector}
            onPress={() => setPickerMode('pickup')}
          >
            <Text style={styles.pointDot}>🟢</Text>
            <View style={styles.selectorDetails}>
              <Text style={styles.selectorLabel}>PICKUP LOCATION</Text>
              <Text style={[styles.selectorValue, { color: pickup ? colors.textPrimary : colors.textMuted }]}>
                {pickup ? pickup.name || pickup.address : 'Select pickup point...'}
              </Text>
            </View>
            <Text style={styles.changeAction}>Select</Text>
          </TouchableOpacity>

          {/* Pickup Landmark / Note Field */}
          {pickup && (
            <View style={styles.landmarkBox}>
              <Text style={styles.landmarkIcon}>📌</Text>
              <Input
                placeholder="Add Landmark (e.g. In front of 7-Eleven, beside blue gate)"
                value={pickupLandmark}
                onChangeText={setPickupLandmark}
                containerStyle={styles.landmarkInput}
              />
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Dropoff Selector */}
          <TouchableOpacity
            style={styles.locationSelector}
            onPress={() => setPickerMode('dropoff')}
          >
            <Text style={styles.pointDot}>🔴</Text>
            <View style={styles.selectorDetails}>
              <Text style={styles.selectorLabel}>DESTINATION</Text>
              <Text style={[styles.selectorValue, { color: dropoff ? colors.textPrimary : colors.textMuted }]}>
                {dropoff ? dropoff.name || dropoff.address : 'Select destination...'}
              </Text>
            </View>
            <Text style={styles.changeAction}>Select</Text>
          </TouchableOpacity>
        </View>

        {/* Passenger Count Selector (1-7) */}
        <View style={styles.passengerCountCard}>
          <View>
            <Text style={styles.passengerCountTitle}>Number of Passengers</Text>
            <Text style={styles.passengerCountSubtitle}>
              Tricycle capacity limit is 5 to 7 passengers
            </Text>
          </View>

          <View style={styles.counterRow}>
            <TouchableOpacity
              style={[styles.countBtn, passengerCount <= 1 && styles.countBtnDisabled]}
              onPress={() => setPassengerCount((c) => Math.max(1, c - 1))}
              disabled={passengerCount <= 1}
            >
              <Text style={styles.countBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.countNumber}>{passengerCount}</Text>

            <TouchableOpacity
              style={[styles.countBtn, passengerCount >= 7 && styles.countBtnDisabled]}
              onPress={() => setPassengerCount((c) => Math.min(7, c + 1))}
              disabled={passengerCount >= 7}
            >
              <Text style={styles.countBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fare Breakdown */}
        {fareEstimate && <FareBreakdownCard estimate={fareEstimate} />}

        {/* Submit Booking Button */}
        <Button
          title={
            fareEstimate
              ? `Confirm Booking • ₱${fareEstimate.total_fare.toFixed(2)}`
              : 'Select Route to View Fare'
          }
          onPress={handleConfirmBooking}
          disabled={!pickup || !dropoff}
          loading={loading}
          size="lg"
          style={styles.confirmBtn}
        />
      </ScrollView>

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={pickerMode !== null}
        title={pickerMode === 'pickup' ? 'Select Pickup Point' : 'Select Destination'}
        onSelect={(loc) => {
          if (pickerMode === 'pickup') setPickup(loc);
          else setDropoff(loc);
        }}
        onClose={() => setPickerMode(null)}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  pointDot: {
    fontSize: 16,
    marginRight: spacing.md,
  },
  selectorDetails: {
    flex: 1,
  },
  selectorLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 10,
  },
  selectorValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  placeholderText: {
    color: colors.textMuted,
    fontWeight: 'normal',
  },
  changeAction: {
    ...typography.captionBold,
    color: '#0284C7',
    marginLeft: spacing.sm,
  },
  landmarkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginLeft: 28,
    marginRight: 4,
  },
  landmarkIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  landmarkInput: {
    flex: 1,
    marginBottom: 0,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
    marginLeft: 28,
  },
  passengerCountCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passengerCountTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  passengerCountSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 180,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderSubtle,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  countBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  countBtnDisabled: {
    opacity: 0.4,
  },
  countBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  countNumber: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
  },
  confirmBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
