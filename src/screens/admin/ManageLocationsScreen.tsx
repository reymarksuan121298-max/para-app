import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { FormInput } from '../../components/common/FormInput';
import { Button } from '../../components/common/Button';
import {
  getAllLocations,
  createLocation,
  deleteLocation,
  getLivePassengerLocations,
  LivePassengerLocation,
} from '../../api/admin';
import { LocationItem } from '../../types';
import { SidebarDrawer } from '../../components/common/SidebarDrawer';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../api/supabaseClient';
import { getCurrentCoordinates, reverseGeocode } from '../../utils/location';
import {
  locationSchema,
  zodResolver,
  LocationFormValues,
  LocationFormData,
} from '../../utils/validators';

export const ManageLocationsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reference' | 'live_passenger'>('reference');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [livePassengerLocs, setLivePassengerLocs] = useState<LivePassengerLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Form state for new location (coordinates arrive as text from the keyboard
  // and are converted to numbers by the resolver on submit).
  const { control, handleSubmit, reset, setValue, getValues } = useForm<
    LocationFormValues,
    unknown,
    LocationFormData
  >({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '', latitude: '', longitude: '' },
    mode: 'onBlur',
  });
  const [isPopular, setIsPopular] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [refData, liveData] = await Promise.all([
        getAllLocations(),
        getLivePassengerLocations(),
      ]);
      setLocations(refData);
      setLivePassengerLocs(liveData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Real-time synchronization on both locations and active passenger rides
    const channel = supabase
      .channel('admin_locations_live_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations' },
        () => {
          getAllLocations().then(setLocations).catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        () => {
          getLivePassengerLocations().then(setLivePassengerLocs).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleUseCurrentGps = async () => {
    try {
      setGettingGps(true);
      const coords = await getCurrentCoordinates();
      if (coords) {
        setValue('latitude', coords.latitude.toFixed(6));
        setValue('longitude', coords.longitude.toFixed(6));
        const geo = await reverseGeocode(coords.latitude, coords.longitude);
        if (geo.name && !getValues('name')) {
          setValue('name', geo.name);
        }
        if (geo.fullAddress) {
          setValue('address', geo.fullAddress);
        }
      } else {
        Alert.alert('GPS Unavailable', 'Could not obtain device GPS coordinates.');
      }
    } finally {
      setGettingGps(false);
    }
  };

  const handleAddLocation = handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      // `values` is the parsed payload: names/addresses are trimmed and the
      // coordinates are validated numbers (never `NaN`).
      await createLocation({
        name: values.name,
        address: values.address,
        latitude: values.latitude,
        longitude: values.longitude,
        is_popular: isPopular,
      });

      setShowAddModal(false);
      reset();
      await fetchAllData();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error && err.message ? err.message : 'Failed to create location',
      );
    } finally {
      setSubmitting(false);
    }
  });

  const handleDeleteLocation = (loc: LocationItem) => {
    Alert.alert('Delete Location', `Are you sure you want to delete ${loc.name || loc.address}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLocations((prev) => prev.filter((l) => l.location_id !== loc.location_id));
          try {
            await deleteLocation(loc.location_id);
          } catch (err) {
            await fetchAllData();
            Alert.alert(
              'Error',
              err instanceof Error && err.message
                ? err.message
                : 'Failed to delete location from server.',
            );
          }
        },
      },
    ]);
  };

  const currentListData = activeTab === 'reference' ? locations : livePassengerLocs;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="Location Manager"
        subtitle="Real-Time Hubs & Passenger Points"
        onMenu={() => setSidebarOpen(true)}
        rightElement={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addHeaderText}>+ Add Hub</Text>
          </TouchableOpacity>
        }
      />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Segment Selector */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'reference' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('reference')}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'reference' ? styles.segmentTextActive : { color: colors.textSecondary },
            ]}
          >
            ⭐ Reference Hubs ({locations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'live_passenger' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('live_passenger')}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'live_passenger' ? styles.segmentTextActive : { color: colors.textSecondary },
            ]}
          >
            ⚡ Live Passenger GPS ({livePassengerLocs.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentListData as any[]}
        keyExtractor={(item) => item.location_id || item.id}
        refreshing={loading}
        onRefresh={fetchAllData}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {activeTab === 'reference' ? 'No Reference Hubs' : 'No Live Passenger Bookings'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'reference'
                ? 'Add custom terminals and landmarks for your area.'
                : 'Passenger booking GPS coordinates will appear here in real time.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>
                  {activeTab === 'reference' ? (item.is_popular ? '⭐' : '📍') : '👤'}
                </Text>
              </View>
              <View style={styles.details}>
                <View style={styles.titleRow}>
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name || item.address}
                  </Text>
                  {item.status && (
                    <Text style={[styles.statusBadge, { color: item.status === 'completed' ? colors.success : colors.primaryDark }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.address}
                </Text>
                {item.passenger_name && (
                  <Text style={[styles.passengerNameText, { color: colors.primaryDark }]}>
                    Booked by: {item.passenger_name}
                  </Text>
                )}
                <Text style={[styles.coords, { color: colors.textMuted }]}>
                  Coords: {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                </Text>
              </View>
              {activeTab === 'reference' && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  activeOpacity={0.6}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => handleDeleteLocation(item)}
                >
                  <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}
      />

      {/* Add Location Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Reference Hub</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Register an official terminal, landmark, or pickup station
            </Text>

            <TouchableOpacity
              style={[styles.gpsAutoFillBtn, { borderColor: colors.primary }]}
              onPress={handleUseCurrentGps}
              disabled={gettingGps}
            >
              {gettingGps ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.gpsAutoFillText, { color: colors.primaryDark }]}>
                  📍 Auto-Fill with Current Device GPS
                </Text>
              )}
            </TouchableOpacity>

            <FormInput
              control={control}
              name="name"
              label="Landmark / Station Name"
              placeholder="e.g. Central Terminal Hub"
            />

            <FormInput
              control={control}
              name="address"
              label="Full Address / Area"
              placeholder="e.g. Barangay Poblacion, Main Highway"
            />

            <View style={styles.coordsRow}>
              <FormInput
                control={control}
                name="latitude"
                label="Latitude"
                placeholder="6.9604"
                keyboardType="decimal-pad"
                containerStyle={styles.coordInput}
              />
              <FormInput
                control={control}
                name="longitude"
                label="Longitude"
                placeholder="125.0886"
                keyboardType="decimal-pad"
                containerStyle={styles.coordInput}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowAddModal(false)}
                style={styles.cancelBtn}
              />
              <Button
                title="Save Location"
                onPress={handleAddLocation}
                loading={submitting}
                style={styles.saveBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  addHeaderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  addHeaderText: {
    ...typography.captionBold,
    color: colors.white,
  },
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtnActive: {
    borderColor: 'transparent',
  },
  segmentText: {
    ...typography.captionBold,
    fontSize: 11,
  },
  segmentTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.heading3,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 260,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  details: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  name: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    ...typography.captionBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  passengerNameText: {
    ...typography.captionBold,
    fontSize: 11,
    marginTop: 2,
  },
  address: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  coords: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  deleteText: {
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  gpsAutoFillBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.primarySubtle,
  },
  gpsAutoFillText: {
    ...typography.captionBold,
    fontSize: 12,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  coordInput: {
    flex: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 2,
  },
});
