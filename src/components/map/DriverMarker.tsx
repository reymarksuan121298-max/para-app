import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors, borderRadius, typography } from '../../theme';
import { NearbyDriver } from '../../types';

interface DriverMarkerProps {
  driver: NearbyDriver;
  onPress?: () => void;
}

export const DriverMarker: React.FC<DriverMarkerProps> = ({ driver, onPress }) => {
  if (!driver.current_lat || !driver.current_lng) return null;

  return (
    <Marker
      coordinate={{
        latitude: Number(driver.current_lat),
        longitude: Number(driver.current_lng),
      }}
      onPress={onPress}
      title={driver.driver_name}
      description={`Plate: ${driver.vehicle_number} | Capacity: ${driver.seat_capacity} seats`}
    >
      <View style={styles.markerContainer}>
        <View style={styles.bubble}>
          <Text style={styles.icon}>🛺</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{driver.seat_capacity} seats</Text>
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.full,
    padding: 6,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    fontSize: 18,
  },
  badge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  badgeText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.textPrimary,
  },
});
