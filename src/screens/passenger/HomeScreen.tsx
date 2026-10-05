import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  PassengerStackParamList,
  PassengerTabParamList,
  NearbyDriver,
} from '../../types';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { MapViewContainer } from '../../components/map/MapViewContainer';
import { getNearbyDrivers } from '../../api/drivers';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { MAKILALA_COORDINATES } from '../../utils/constants';
import { getCurrentCoordinates } from '../../utils/location';
import { SidebarDrawer } from '../../components/common/SidebarDrawer';

type Props = CompositeScreenProps<
  BottomTabScreenProps<PassengerTabParamList, 'PassengerHome'>,
  NativeStackScreenProps<PassengerStackParamList>
>;

import { useTheme } from '../../hooks/useTheme';

export const HomeScreen: React.FC<any> = ({ navigation }) => {
  const user = useAuthStore((s) => s.user);
  const activeRide = useRideStore((s) => s.activeRide);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoadingDrivers(true);
      const coords = await getCurrentCoordinates();
      const lat = coords?.latitude ?? MAKILALA_COORDINATES.latitude;
      const lng = coords?.longitude ?? MAKILALA_COORDINATES.longitude;

      const drivers = await getNearbyDrivers(lat, lng, 1, 10.0);
      setNearbyDrivers(drivers);
    } catch {
      // ignore
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Map View with Nearby Tricycles */}
      <View style={styles.mapWrapper}>
        <MapViewContainer nearbyDrivers={nearbyDrivers} />

        {/* Top Header Card */}
        <View style={[styles.topCard, { backgroundColor: colors.surface }]}>
          <View style={styles.greetingRow}>
            <TouchableOpacity
              onPress={() => setSidebarOpen(true)}
              style={styles.hamburgerBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.hamburgerIcon, { color: colors.textPrimary }]}>☰</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text
                style={[styles.greeting, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                Hello, {user?.name?.split(' ')[0] || 'Passenger'} 👋
              </Text>
              <Text
                style={[styles.subtext, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {nearbyDrivers.length} tricycle(s) active nearby
              </Text>
            </View>
            <TouchableOpacity onPress={fetchDrivers} style={styles.refreshBtn}>
              {loadingDrivers ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.refreshIcon}>🔄</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Ride Banner if user has ongoing ride */}
        {activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled' && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.activeRideBanner, { backgroundColor: colors.primaryDark }]}
            onPress={() => navigation.navigate('TrackRide', { rideId: activeRide.ride_id })}
          >
            <View style={[styles.activeRideIndicator, { backgroundColor: colors.secondary }]} />
            <View style={styles.activeRideInfo}>
              <Text style={styles.activeRideTitle}>Active Trip in Progress</Text>
              <Text style={[styles.activeRideStatus, { color: colors.primaryLight }]}>
                {activeRide.status.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.trackChevron, { color: colors.secondary }]}>Track →</Text>
          </TouchableOpacity>
        )}

        {/* Bottom Booking Action Drawer */}
        <View style={[styles.bottomDrawer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Where are you heading?</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => navigation.navigate('BookRide', {})}
          >
            <Text style={styles.searchPin}>📍</Text>
            <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
              Select pickup & destination...
            </Text>
            <View style={[styles.bookActionBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.bookActionText}>Book 🛺</Text>
            </View>
          </TouchableOpacity>
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
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  topCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hamburgerBtn: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  hamburgerIcon: {
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  greeting: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  subtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  refreshBtn: {
    padding: spacing.xs,
  },
  refreshIcon: {
    fontSize: 20,
  },
  activeRideBanner: {
    position: 'absolute',
    top: 100,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  activeRideIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondary,
    marginRight: spacing.sm,
  },
  activeRideInfo: {
    flex: 1,
  },
  activeRideTitle: {
    ...typography.bodyBold,
    color: colors.white,
  },
  activeRideStatus: {
    ...typography.caption,
    color: colors.primaryLight,
  },
  trackChevron: {
    ...typography.bodyBold,
    color: colors.secondary,
  },
  bottomDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  drawerTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  searchPin: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    ...typography.body,
    color: colors.textMuted,
  },
  bookActionBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  bookActionText: {
    ...typography.captionBold,
    color: colors.white,
  },
});
