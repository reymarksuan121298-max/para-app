import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';

import { SidebarDrawer } from '../../components/common/SidebarDrawer';
import { useTheme } from '../../hooks/useTheme';

import { getSavedPlaces, savePlace, removeSavedPlace, SavedPlace } from '../../utils/savedLocations';
import { LocationPickerModal } from '../../components/map/LocationPickerModal';
import { LocationItem } from '../../types';

export const PassengerProfileScreen: React.FC = () => {
  const { user, passenger, signOut } = useAuthStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const [savedPlaces, setSavedPlaces] = React.useState<SavedPlace[]>([]);
  const [pickerVisible, setPickerVisible] = React.useState(false);
  const [editingType, setEditingType] = React.useState<'home' | 'work' | 'school' | 'custom'>('home');

  React.useEffect(() => {
    loadSavedPlaces();
  }, []);

  const loadSavedPlaces = async () => {
    const places = await getSavedPlaces();
    setSavedPlaces(places);
  };

  const handleSelectLocation = async (loc: LocationItem) => {
    setPickerVisible(false);
    let label = 'Favorite Place';
    let icon = '📍';
    if (editingType === 'home') {
      label = 'Home';
      icon = '🏠';
    } else if (editingType === 'work') {
      label = 'Work';
      icon = '💼';
    }

    await savePlace({
      type: editingType,
      label,
      address: loc.address || loc.name || 'Saved Address',
      latitude: loc.latitude,
      longitude: loc.longitude,
      icon,
    });

    await loadSavedPlaces();
    Alert.alert('Success', `${label} location saved successfully!`);
  };

  const handleDeleteSaved = async (id: string, label: string) => {
    Alert.alert('Remove Location', `Are you sure you want to remove "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = await removeSavedPlace(id);
          setSavedPlaces(updated);
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of PARA?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="My Profile"
        onMenu={() => setSidebarOpen(true)}
      />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name || 'Passenger'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>PASSENGER</Text>
          </View>
        </Card>

        {/* Saved Places Management */}
        <View style={styles.savedPlacesHeaderRow}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginBottom: 0 }]}>
            SAVED LOCATIONS
          </Text>
          <TouchableOpacity
            style={styles.addSavedPlaceBtn}
            onPress={() => {
              setEditingType('custom');
              setPickerVisible(true);
            }}
          >
            <Text style={styles.addSavedPlaceText}>+ Add Place</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard}>
          {savedPlaces.length === 0 ? (
            <TouchableOpacity
              style={styles.emptySavedPlacesBox}
              onPress={() => {
                setEditingType('home');
                setPickerVisible(true);
              }}
            >
              <Text style={styles.emptySavedPlacesIcon}>📍</Text>
              <Text style={[styles.emptySavedPlacesText, { color: colors.textPrimary }]}>
                No saved places yet
              </Text>
              <Text style={[styles.emptySavedPlacesSub, { color: colors.textSecondary }]}>
                Tap to save Home, Work, or favorite spots across the Philippines
              </Text>
            </TouchableOpacity>
          ) : (
            savedPlaces.map((place, idx) => (
              <React.Fragment key={place.id || idx}>
                <View style={styles.savedPlaceRow}>
                  <View style={styles.savedPlaceIconBox}>
                    <Text style={styles.savedPlaceIcon}>{place.icon}</Text>
                  </View>
                  <View style={styles.savedPlaceInfo}>
                    <Text style={[styles.savedPlaceLabel, { color: colors.textPrimary }]}>{place.label}</Text>
                    <Text style={[styles.savedPlaceAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                      {place.address}
                    </Text>
                  </View>
                  <View style={styles.savedPlaceActions}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => {
                        setEditingType(place.type);
                        setPickerVisible(true);
                      }}
                    >
                      <Text style={styles.actionIconText}>✏️</Text>
                    </TouchableOpacity>
                    {place.type === 'custom' && (
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleDeleteSaved(place.id, place.label)}
                      >
                        <Text style={styles.actionIconText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {idx < savedPlaces.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))
          )}
        </Card>

        {/* Account Details */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Account Information</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone Number</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.phone || 'Not provided'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Total Rides Taken</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{passenger?.total_rides || 0}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Preferred Payment</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>Cash (Direct to Driver)</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location Service Area</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>Makilala, North Cotabato</Text>
          </View>
        </Card>

        {/* Sign Out Button */}
        <Button
          title="Log Out"
          variant="outline"
          onPress={handleSignOut}
          style={styles.signOutBtn}
        />
      </ScrollView>

      {/* Location Picker for Saved Places */}
      <LocationPickerModal
        visible={pickerVisible}
        title={`Set ${editingType === 'home' ? 'Home' : editingType === 'work' ? 'Work' : 'Favorite'} Location`}
        onSelect={handleSelectLocation}
        onClose={() => setPickerVisible(false)}
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
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  avatarIcon: {
    fontSize: 32,
  },
  userName: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  roleText: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  sectionHeader: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: spacing.sm,
    marginLeft: 4,
  },
  savedPlacesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  addSavedPlaceBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  addSavedPlaceText: {
    ...typography.captionBold,
    color: '#0284C7',
  },
  emptySavedPlacesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  emptySavedPlacesIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  emptySavedPlacesText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  emptySavedPlacesSub: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 240,
  },
  savedPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  savedPlaceIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  savedPlaceIcon: {
    fontSize: 20,
  },
  savedPlaceInfo: {
    flex: 1,
  },
  savedPlaceLabel: {
    ...typography.bodyBold,
  },
  savedPlaceAddress: {
    ...typography.caption,
    marginTop: 2,
  },
  savedPlaceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    padding: 6,
  },
  actionIconText: {
    fontSize: 16,
  },
  infoCard: {
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.body,
  },
  infoValue: {
    ...typography.bodyBold,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  signOutBtn: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
});
