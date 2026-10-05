import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DriverStackParamList } from '../../types';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { MapViewContainer } from '../../components/map/MapViewContainer';
import { RideStatusCard } from '../../components/ride/RideStatusCard';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useRealtimeRide } from '../../hooks/useRealtimeRide';
import { completeTrip, updateRideStatus } from '../../api/rides';
import { useAuthStore } from '../../store/authStore';
import { useDriverStore } from '../../store/driverStore';
import { formatCurrency } from '../../utils/fareCalculator';
import { useTheme } from '../../hooks/useTheme';
import { getErrorMessage } from '../../utils/errors';

type Props = NativeStackScreenProps<DriverStackParamList, 'ActiveTrip'>;

export const ActiveTripScreen: React.FC<Props> = ({ route, navigation }) => {
  const { rideId } = route.params;
  const driver = useAuthStore((s) => s.driver);
  const { broadcastLocation } = useDriverStore();
  const { ride, loading } = useRealtimeRide(rideId);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [updating, setUpdating] = useState(false);

  // High-frequency 1000ms GPS location broadcast during active incoming & ongoing trip
  useEffect(() => {
    if (!driver?.driver_id) return;
    const activeDriverId = driver.driver_id;

    const onPos = (pos: any) => {
      broadcastLocation(activeDriverId, pos.coords.latitude, pos.coords.longitude);
    };

    const watchId = Geolocation.watchPosition(onPos, () => {}, {
      enableHighAccuracy: true,
      distanceFilter: 1, // trigger on every 1 meter movement
      interval: 1000,    // 1000ms high-precision GPS broadcast to passenger
      fastestInterval: 1000,
    });

    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, [driver?.driver_id, broadcastLocation]);

  // Listen for passenger cancellation
  useEffect(() => {
    if (ride?.status === 'cancelled') {
      Alert.alert(
        'Trip Cancelled',
        ride.cancel_reason
          ? `The passenger cancelled this trip: "${ride.cancel_reason}"`
          : 'The passenger has cancelled this booking request.',
        [
          {
            text: 'Return to Dashboard',
            onPress: () => navigation.navigate('DriverDashboard'),
          },
        ]
      );
    }
  }, [ride?.status, ride?.cancel_reason, navigation]);

  if (loading && !ride) {
    return <LoadingScreen message="Loading trip details..." />;
  }

  if (!ride) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <Header title="Active Trip" onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Trip data not found.</Text>
          <Button title="Back to Dashboard" onPress={() => navigation.navigate('DriverDashboard')} />
        </View>
      </SafeAreaView>
    );
  }

  const pickupCoords = {
    latitude: Number(ride.pickup_lat),
    longitude: Number(ride.pickup_lng),
  };

  const dropoffCoords = {
    latitude: Number(ride.dropoff_lat),
    longitude: Number(ride.dropoff_lng),
  };

  const passengerPhone = ride.passenger?.user?.phone;
  const passengerName = ride.passenger?.user?.name || 'Passenger';

  const handleCallPassenger = () => {
    if (passengerPhone) {
      Linking.openURL(`tel:${passengerPhone}`).catch(() => {
        Alert.alert('Phone Call', `Unable to open dialer for ${passengerPhone}`);
      });
    } else {
      Alert.alert('Contact Passenger', 'Passenger phone number is not available.');
    }
  };

  const handleSmsPassenger = () => {
    if (passengerPhone) {
      Linking.openURL(`sms:${passengerPhone}?body=Hi! I am your PARA Tricycle driver and I am on my way to your pickup location.`).catch(() => {
        Alert.alert('SMS', `Unable to open SMS app for ${passengerPhone}`);
      });
    } else {
      Alert.alert('Contact Passenger', 'Passenger phone number is not available.');
    }
  };

  const handleNextStatus = async () => {
    if (!driver?.driver_id) return;

    try {
      setUpdating(true);

      if (ride.status === 'accepted') {
        await updateRideStatus(ride.ride_id, 'en_route_to_pickup');
      } else if (ride.status === 'en_route_to_pickup') {
        await updateRideStatus(ride.ride_id, 'in_progress');
      } else if (ride.status === 'in_progress') {
        // Complete trip and record cash payment
        await completeTrip(ride.ride_id, driver.driver_id);
        Alert.alert(
          'Trip Completed! 🎉',
          `Collected cash fare of ${formatCurrency(Number(ride.fare))} from passenger.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('DriverDashboard'),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to update trip status'));
    } finally {
      setUpdating(false);
    }
  };

  const getActionButtonConfig = () => {
    switch (ride.status) {
      case 'accepted':
        return {
          title: 'Arrived at Pickup Location',
          variant: 'primary' as const,
        };
      case 'en_route_to_pickup':
        return {
          title: 'Start Trip with Passenger',
          variant: 'primary' as const,
        };
      case 'in_progress':
        return {
          title: `Complete Trip • Collect ${formatCurrency(Number(ride.fare))}`,
          variant: 'success' as const,
        };
      default:
        return {
          title: 'Trip Ended',
          variant: 'ghost' as const,
        };
    }
  };

  const actionConfig = getActionButtonConfig();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="Active Passenger Trip"
        onBack={() => navigation.navigate('DriverDashboard')}
      />

      <View style={styles.mapContainer}>
        <MapViewContainer
          pickupCoord={pickupCoords}
          dropoffCoord={dropoffCoords}
        />

        {/* Bottom Control Drawer */}
        <View style={[styles.bottomDrawer, { backgroundColor: colors.surface }]}>
          {/* Passenger Contact Card */}
          <View style={[styles.passengerContactCard, { borderColor: colors.border }]}>
            <View style={styles.passengerAvatar}>
              <Text style={styles.passengerAvatarIcon}>👤</Text>
            </View>
            <View style={styles.passengerInfo}>
              <Text style={[styles.passengerNameText, { color: colors.textPrimary }]}>{passengerName}</Text>
              <Text style={[styles.passengerPhoneText, { color: colors.textSecondary }]}>
                {passengerPhone || 'No phone number'}
              </Text>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={[styles.contactBtn, styles.callBtn]}
                onPress={handleCallPassenger}
                activeOpacity={0.8}
              >
                <Text style={styles.contactBtnIcon}>📞</Text>
                <Text style={styles.contactBtnLabel}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactBtn, styles.smsBtn]}
                onPress={handleSmsPassenger}
                activeOpacity={0.8}
              >
                <Text style={styles.contactBtnIcon}>💬</Text>
                <Text style={styles.contactBtnLabel}>SMS</Text>
              </TouchableOpacity>
            </View>
          </View>

          <RideStatusCard ride={ride} showDriverDetails={false} />

          {ride.status !== 'completed' && ride.status !== 'cancelled' && (
            <Button
              title={actionConfig.title}
              onPress={handleNextStatus}
              loading={updating}
              size="lg"
              variant={actionConfig.variant}
              style={styles.actionBtn}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  bottomDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  passengerContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  passengerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  passengerAvatarIcon: {
    fontSize: 18,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerNameText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  passengerPhoneText: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  callBtn: {
    backgroundColor: '#0284C7',
  },
  smsBtn: {
    backgroundColor: '#0F766E',
  },
  contactBtnIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  contactBtnLabel: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 11,
  },
  actionBtn: {
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    marginBottom: spacing.md,
  },
});
