import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  DriverStackParamList,
  DriverTabParamList,
  Ride,
} from '../../types';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { MapViewContainer } from '../../components/map/MapViewContainer';
import { IncomingRequestModal } from '../../components/driver/IncomingRequestModal';
import { formatCurrency } from '../../utils/fareCalculator';
import { useAuthStore } from '../../store/authStore';
import { useDriverStore } from '../../store/driverStore';
import { useDriverLocation } from '../../hooks/useDriverLocation';
import { acceptRide, subscribeToPendingRides, getPendingRides } from '../../api/rides';
import { getDriverEarningsSummary } from '../../api/drivers';
import { supabase } from '../../api/supabaseClient';
import { calculateDistanceKm } from '../../utils/distance';

type Props = CompositeScreenProps<
  BottomTabScreenProps<DriverTabParamList, 'DriverDashboard'>,
  NativeStackScreenProps<DriverStackParamList>
>;

import { LocationPickerModal } from '../../components/map/LocationPickerModal';
import { LocationItem } from '../../types';
import { SidebarDrawer } from '../../components/common/SidebarDrawer';
import { getErrorMessage } from '../../utils/errors';
import { useTheme } from '../../hooks/useTheme';
import { useFareSettings } from '../../hooks/useFareSettings';
import { getCurrentCoordinates } from '../../utils/location';

export const DriverDashboardScreen: React.FC<any> = ({ navigation }) => {
  const user = useAuthStore((s) => s.user);
  const driver = useAuthStore((s) => s.driver);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { settings: fareSettings } = useFareSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [customAreaName, setCustomAreaName] = useState<string | null>(null);

  const {
    status,
    currentLat,
    currentLng,
    incomingRequest,
    declinedRideIds,
    toggleOnline,
    setIncomingRequest,
    declineRequest,
  } = useDriverStore();

  const [earningsSummary, setEarningsSummary] = useState({
    todayTotal: 0,
    todayTrips: 0,
    weekTotal: 0,
  });

  const isOnline = status === 'online';

  // Synchronize initial status from driver profile
  useEffect(() => {
    if (driver?.status && driver.status !== status) {
      useDriverStore.getState().setStatus(driver.status);
    }
  }, [driver?.status]);

  // Broadcast driver GPS coordinates while online
  useDriverLocation(driver?.driver_id, isOnline);

  // Fetch earnings summary & listen to real-time completions/payments
  useEffect(() => {
    if (!driver?.driver_id) return;

    const refreshEarnings = () => {
      getDriverEarningsSummary(driver.driver_id).then(setEarningsSummary).catch(() => {});
    };

    refreshEarnings();

    // Realtime channel for rides & payments update
    const channel = supabase
      .channel(`driver_earnings_${driver.driver_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${driver.driver_id}`,
        },
        () => {
          refreshEarnings();
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
          refreshEarnings();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [driver?.driver_id, status]);

  // Realtime subscription + active polling for incoming pending rides in driver's nearby area
  useEffect(() => {
    if (!isOnline || !driver?.driver_id) return;

    const checkRideEligibility = (ride: Ride) => {
      if (!ride || ride.status !== 'pending') return;

      // Read the live driver snapshot instead of closing over render values:
      // GPS ticks change currentLat/currentLng constantly, and having them in
      // the effect deps tore down (and re-created) the realtime channel and
      // polling interval on every tick.
      const { currentLat, currentLng, declinedRideIds } = useDriverStore.getState();

      // 1. Check if driver has already declined this ride
      if (declinedRideIds.includes(ride.ride_id)) return;

      // 2. Check if driver's tricycle capacity is sufficient
      if (driver.seat_capacity && ride.passenger_count && driver.seat_capacity < ride.passenger_count) return;

      // 3. Nearby Location Filtering: Check distance between driver and passenger pickup
      const driverLat = currentLat || (driver.current_lat ? Number(driver.current_lat) : null);
      const driverLng = currentLng || (driver.current_lng ? Number(driver.current_lng) : null);

      if (driverLat && driverLng && ride.pickup_lat && ride.pickup_lng) {
        const distKm = calculateDistanceKm(
          driverLat,
          driverLng,
          Number(ride.pickup_lat),
          Number(ride.pickup_lng)
        );

        // Regional proximity restriction: match within driver's local service radius
        const matchRadius = Number(fareSettings?.match_radius_km) || 5.0;
        if (distKm > matchRadius) {
          return; // Skip passenger booking outside driver's service region
        }
      }

      // Display incoming ride alert
      setIncomingRequest(ride);
    };

    const handleRideCancelledOrTaken = (cancelledRideId: string, rideStatus?: string) => {
      const currentReq = useDriverStore.getState().incomingRequest;
      if (currentReq && currentReq.ride_id === cancelledRideId) {
        setIncomingRequest(null);
        if (rideStatus === 'cancelled') {
          Alert.alert(
            'Passenger Cancelled',
            'The passenger has cancelled this booking request.'
          );
        }
      }
    };

    const channel = subscribeToPendingRides(checkRideEligibility, handleRideCancelledOrTaken);

    // Backup polling check every 3 seconds so cancellations and new requests are synced instantly
    const pollTimer = setInterval(async () => {
      try {
        const currentReq = useDriverStore.getState().incomingRequest;
        if (currentReq) {
          const { data: checkStillPending } = await supabase
            .from('rides')
            .select('status')
            .eq('ride_id', currentReq.ride_id)
            .maybeSingle();

          if (checkStillPending && checkStillPending.status !== 'pending') {
            setIncomingRequest(null);
            if (checkStillPending.status === 'cancelled') {
              Alert.alert(
                'Passenger Cancelled',
                'The passenger has cancelled this booking request.'
              );
            }
            return;
          }
        }

        const pending = await getPendingRides();
        const { declinedRideIds } = useDriverStore.getState();
        for (const r of pending) {
          if (!declinedRideIds.includes(r.ride_id)) {
            checkRideEligibility(r);
            break;
          }
        }
      } catch {}
    }, 3000);

    return () => {
      channel.unsubscribe();
      clearInterval(pollTimer);
    };
  }, [isOnline, driver?.driver_id, driver?.seat_capacity, fareSettings?.match_radius_km, setIncomingRequest]);

  const handleToggleOnline = async () => {
    if (!driver?.driver_id) return;
    await toggleOnline(driver.driver_id);
    if (!isOnline) {
      const coords = await getCurrentCoordinates();
      if (coords) {
        await useDriverStore.getState().broadcastLocation(driver.driver_id, coords.latitude, coords.longitude);
      }
    }
  };

  const handleAcceptRide = async (ride: Ride) => {
    if (!driver?.driver_id) return;
    try {
      await acceptRide(ride.ride_id, driver.driver_id);
      setIncomingRequest(null);
      navigation.navigate('ActiveTrip', { rideId: ride.ride_id });
    } catch (err) {
      Alert.alert('Ride Unavailable', getErrorMessage(err, 'Ride was accepted by another driver.'));
      setIncomingRequest(null);
    }
  };

  const handleSelectArea = async (loc: LocationItem) => {
    setShowAreaPicker(false);
    const areaTitle = loc.name || loc.address;
    setCustomAreaName(areaTitle);
    if (driver?.driver_id) {
      await useDriverStore.getState().broadcastLocation(driver.driver_id, loc.latitude, loc.longitude);
      Alert.alert('Coverage Area Updated', `Driver location relocated to: ${areaTitle}`);
    }
  };

  const handleResetToGps = async () => {
    setCustomAreaName(null);
    if (driver?.driver_id) {
      const coords = await getCurrentCoordinates();
      if (coords) {
        await useDriverStore.getState().broadcastLocation(driver.driver_id, coords.latitude, coords.longitude);
        Alert.alert('GPS Restored', 'Driver position synchronized with real device GPS.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="Driver Dashboard"
        subtitle={`Plate: ${driver?.vehicle_number || 'N/A'} • ${driver?.seat_capacity || 6} Seats`}
        onMenu={() => setSidebarOpen(true)}
        rightElement={
          // One handler per touch target: nesting the Switch inside a
          // TouchableOpacity that also toggles fired both handlers, flipping
          // the status twice so the switch appeared to snap straight back.
          <View
            style={[
              styles.headerToggleBadge,
              {
                backgroundColor: isOnline ? (colors.primarySubtle || '#DCFCE7') : colors.surface,
                borderColor: isOnline ? colors.primary : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.headerStatusDot,
                { backgroundColor: isOnline ? colors.success : colors.textMuted },
              ]}
            />
            <TouchableOpacity
              onPress={handleToggleOnline}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={[
                  styles.headerToggleText,
                  { color: isOnline ? colors.primaryDark : colors.textSecondary },
                ]}
              >
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </TouchableOpacity>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isOnline ? colors.primaryDark : colors.textMuted}
              style={styles.headerSwitch}
            />
          </View>
        }
      />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <View style={styles.mainContainer}>
        {/* Real-Time Live Cash Counter Banner */}
        <Card style={styles.cashCounterHeroCard}>
          <View style={styles.cashCounterHeader}>
            <View style={styles.cashCounterLabelRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.cashCounterHeroLabel}>REAL-TIME CASH COLLECTED</Text>
            </View>
            <Text style={styles.cashCounterLiveBadge}>● LIVE SYNC</Text>
          </View>

          <Text style={styles.cashCounterHeroValue}>
            {formatCurrency(earningsSummary.todayTotal)}
          </Text>

          <View style={styles.cashCounterDivider} />

          <View style={styles.cashCounterStatsRow}>
            <View style={styles.cashCounterStatItem}>
              <Text style={styles.cashCounterStatNumber}>{earningsSummary.todayTrips}</Text>
              <Text style={styles.cashCounterStatSub}>Trips Completed</Text>
            </View>
            <View style={styles.cashCounterStatSeparator} />
            <View style={styles.cashCounterStatItem}>
              <Text style={styles.cashCounterStatNumber}>{formatCurrency(earningsSummary.weekTotal)}</Text>
              <Text style={styles.cashCounterStatSub}>This Week</Text>
            </View>
          </View>
        </Card>

        {/* Live Map View showing current driver presence */}
        <View style={styles.mapHeaderRow}>
          <View style={styles.mapHeaderLeft}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Live Area Coverage</Text>
            {customAreaName ? (
              <Text style={[styles.customAreaSub, { color: colors.primaryDark }]} numberOfLines={1}>
                📍 {customAreaName}
              </Text>
            ) : (
              <Text style={[styles.mapStatusBadge, { color: isOnline ? colors.success : colors.textMuted }]}>
                {isOnline ? '🟢 GPS BROADCASTING' : '⚪ OFFLINE'}
              </Text>
            )}
          </View>
          <View style={styles.mapHeaderRight}>
            <TouchableOpacity
              style={[styles.relocateBtn, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}
              onPress={() => setShowAreaPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.relocateBtnText, { color: colors.primaryDark }]}>📍 Change Area</Text>
            </TouchableOpacity>
            {customAreaName && (
              <TouchableOpacity
                style={styles.resetGpsBtn}
                onPress={handleResetToGps}
                activeOpacity={0.7}
              >
                <Text style={styles.resetGpsText}>🔄 GPS</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.mapBox, { borderColor: colors.border }]}>
          <MapViewContainer
            showsUserLocation={isOnline}
            driverCoord={currentLat && currentLng ? { latitude: currentLat, longitude: currentLng } : undefined}
          />
        </View>
      </View>

      {/* Manual Area Relocation Modal */}
      <LocationPickerModal
        visible={showAreaPicker}
        title="Select Active Driver Hub / Area"
        onSelect={handleSelectArea}
        onClose={() => setShowAreaPicker(false)}
      />

      {/* Incoming Ride Alert Modal */}
      <IncomingRequestModal
        visible={incomingRequest !== null}
        ride={incomingRequest}
        onAccept={handleAcceptRide}
        onDecline={(r) => declineRequest(r.ride_id)}
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
  statusCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusCardOnline: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  statusCardOffline: {
    borderLeftWidth: 4,
    borderLeftColor: colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    ...typography.captionBold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  statusDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  cashCounterHeroCard: {
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  cashCounterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cashCounterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  cashCounterHeroLabel: {
    ...typography.captionBold,
    color: '#94A3B8',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  cashCounterLiveBadge: {
    ...typography.captionBold,
    color: '#10B981',
    fontSize: 9,
  },
  cashCounterHeroValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginVertical: 2,
  },
  cashCounterDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  cashCounterStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 2,
  },
  cashCounterStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  cashCounterStatNumber: {
    ...typography.bodyBold,
    color: '#F1F5F9',
    fontSize: 14,
  },
  cashCounterStatSub: {
    ...typography.caption,
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  cashCounterStatSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#334155',
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
    paddingHorizontal: 2,
  },
  mapHeaderLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  mapHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeader: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  customAreaSub: {
    ...typography.captionBold,
    fontSize: 10,
    marginTop: 1,
  },
  mapStatusBadge: {
    ...typography.captionBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  relocateBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  relocateBtnText: {
    ...typography.captionBold,
    fontSize: 10,
  },
  resetGpsBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  resetGpsText: {
    ...typography.captionBold,
    fontSize: 10,
    color: '#F8FAFC',
  },
  mapBox: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  headerToggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  headerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerToggleText: {
    ...typography.captionBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  headerSwitch: {
    transform: [{ scaleX: 0.68 }, { scaleY: 0.68 }],
    marginLeft: -4,
    marginRight: -6,
  },
});
