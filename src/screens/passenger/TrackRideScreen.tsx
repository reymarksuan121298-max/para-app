import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PassengerStackParamList } from '../../types';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { MapViewContainer } from '../../components/map/MapViewContainer';
import { RideStatusCard } from '../../components/ride/RideStatusCard';
import { RatingModal } from '../../components/common/RatingModal';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { useRealtimeRide } from '../../hooks/useRealtimeRide';
import { cancelRide, rateRide } from '../../api/rides';
import { useRideStore } from '../../store/rideStore';

type Props = NativeStackScreenProps<PassengerStackParamList, 'TrackRide'>;

export const TrackRideScreen: React.FC<Props> = ({ route, navigation }) => {
  const { rideId } = route.params;
  const { ride, loading } = useRealtimeRide(rideId);
  const setActiveRide = useRideStore((s) => s.setActiveRide);

  const [cancelling, setCancelling] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (ride?.status === 'completed') {
      setShowRatingModal(true);
      setActiveRide(null);
    }
  }, [ride?.status, setActiveRide]);

  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this tricycle booking request?',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await cancelRide(rideId, 'Cancelled by passenger', 'passenger');
              setActiveRide(null);
              navigation.navigate('PassengerTabs');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel booking');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleRatingSubmit = async (stars: number, comment?: string) => {
    try {
      await rateRide(rideId, stars, comment);
    } catch {
      // ignore
    } finally {
      setShowRatingModal(false);
      navigation.navigate('PassengerTabs');
    }
  };

  if (loading && !ride) {
    return <LoadingOverlay visible message="Locating your ride..." />;
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Ride Tracking" onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Ride details not found.</Text>
          <Button
            title="Back to Home"
            onPress={() => navigation.navigate('PassengerTabs')}
            style={styles.backHomeBtn}
          />
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

  const driverCoords =
    ride.driver?.current_lat && ride.driver?.current_lng
      ? {
          latitude: Number(ride.driver.current_lat),
          longitude: Number(ride.driver.current_lng),
        }
      : null;

  const canCancel = ride.status === 'pending' || ride.status === 'accepted';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Live Tricycle Tracking"
        onBack={() => navigation.navigate('PassengerHome')}
      />

      <View style={styles.mapContainer}>
        <MapViewContainer
          pickupCoord={pickupCoords}
          dropoffCoord={dropoffCoords}
          driverCoord={driverCoords}
        />

        {/* Bottom Status & Info Sheet */}
        <View style={styles.bottomSheet}>
          <RideStatusCard ride={ride} />

          {canCancel && (
            <Button
              title="Cancel Booking"
              variant="danger"
              onPress={handleCancelRide}
              loading={cancelling}
              style={styles.cancelBtn}
            />
          )}
        </View>
      </View>

      {/* Rating Modal on completion */}
      <RatingModal
        visible={showRatingModal}
        driverName={ride.driver?.user?.name || 'Your Driver'}
        onSubmit={handleRatingSubmit}
        onClose={() => {
          setShowRatingModal(false);
          navigation.navigate('PassengerHome');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelBtn: {
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
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  backHomeBtn: {
    minWidth: 160,
  },
});
