import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { FormInput } from '../../components/common/FormInput';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { getFareSettings, updateFareSettings } from '../../api/admin';
import { FareSettings } from '../../types';
import { SidebarDrawer } from '../../components/common/SidebarDrawer';
import { useTheme } from '../../hooks/useTheme';
import {
  fareSettingsSchema,
  zodResolver,
  FareSettingsFormValues,
  FareSettingsFormData,
} from '../../utils/validators';

export const ManageFaresScreen: React.FC = () => {
  const [settings, setSettings] = useState<FareSettings | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Server-side failures (network, permissions) live outside field validation.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Inputs hold text while editing; the resolver converts them to numbers.
  const { control, handleSubmit, reset } = useForm<
    FareSettingsFormValues,
    unknown,
    FareSettingsFormData
  >({
    resolver: zodResolver(fareSettingsSchema),
    defaultValues: {
      base_fare: '',
      base_distance_km: '',
      rate_per_km: '',
      rate_per_extra_passenger: '',
      match_radius_km: '',
      request_timeout_seconds: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getFareSettings();
      if (data) {
        setSettings(data);
        reset({
          base_fare: String(data.base_fare),
          base_distance_km: String(data.base_distance_km),
          rate_per_km: String(data.rate_per_km),
          rate_per_extra_passenger: String(data.rate_per_extra_passenger),
          match_radius_km: String(data.match_radius_km),
          request_timeout_seconds: String(data.request_timeout_seconds),
        });
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message ? err.message : 'Failed to load fare settings',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      setSaving(true);
      setSubmitError(null);

      // `values` is the parsed payload: every field is a validated number, so
      // no `parseFloat`/`NaN` can reach the API.
      await updateFareSettings(values);

      Alert.alert('Success', 'Fare configuration successfully updated across the system!');
      await loadSettings();
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message ? err.message : 'Failed to update fare settings',
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="Manage Fare Settings"
        onMenu={() => setSidebarOpen(true)}
      />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ErrorBanner message={submitError} />

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Tricycle Fare Structure (Makilala)</Text>
          <Text style={styles.sectionSubtitle}>
            These parameters dictate client and server authoritative fare calculations for all
            passenger bookings.
          </Text>

          <FormInput
            control={control}
            name="base_fare"
            label="Base Fare (PHP ₱)"
            placeholder="15.00"
            keyboardType="decimal-pad"
            helperText="Minimum fare for the initial base distance"
          />

          <FormInput
            control={control}
            name="base_distance_km"
            label="Base Distance Threshold (Kilometers)"
            placeholder="2.0"
            keyboardType="decimal-pad"
            helperText="Distance covered by the initial base fare"
          />

          <FormInput
            control={control}
            name="rate_per_km"
            label="Rate Per Extra Kilometer (PHP ₱)"
            placeholder="8.00"
            keyboardType="decimal-pad"
            helperText="Additional charge per km beyond base distance"
          />

          <FormInput
            control={control}
            name="rate_per_extra_passenger"
            label="Rate Per Extra Passenger (PHP ₱)"
            placeholder="5.00"
            keyboardType="decimal-pad"
            helperText="Surcharge per additional passenger (passenger 2 to 7)"
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Dispatch & Timeout Parameters</Text>

          <FormInput
            control={control}
            name="match_radius_km"
            label="Driver Matching Radius (Kilometers)"
            placeholder="3.5"
            keyboardType="decimal-pad"
            helperText="Maximum distance to alert nearby available tricycles"
          />

          <FormInput
            control={control}
            name="request_timeout_seconds"
            label="Ride Request Timeout (Seconds)"
            placeholder="300"
            keyboardType="number-pad"
            helperText="Auto-cancel pending ride if unclaimed (default: 300s / 5 mins)"
          />
        </Card>

        <Button
          title="Save Fare Settings"
          onPress={handleSave}
          loading={saving}
          disabled={loading}
          size="lg"
          style={styles.saveBtn}
        />
      </ScrollView>
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
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  saveBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
});
