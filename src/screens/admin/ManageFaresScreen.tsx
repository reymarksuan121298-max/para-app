import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { getFareSettings, updateFareSettings } from '../../api/admin';
import { FareSettings } from '../../types';
import { SidebarDrawer } from '../../components/common/SidebarDrawer';
import { useTheme } from '../../hooks/useTheme';

export const ManageFaresScreen: React.FC = () => {
  const [settings, setSettings] = useState<FareSettings | null>(null);
  const [baseFare, setBaseFare] = useState('');
  const [baseDistance, setBaseDistance] = useState('');
  const [ratePerKm, setRatePerKm] = useState('');
  const [extraPassengerRate, setExtraPassengerRate] = useState('');
  const [matchRadius, setMatchRadius] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getFareSettings();
      if (data) {
        setSettings(data);
        setBaseFare(String(data.base_fare));
        setBaseDistance(String(data.base_distance_km));
        setRatePerKm(String(data.rate_per_km));
        setExtraPassengerRate(String(data.rate_per_extra_passenger));
        setMatchRadius(String(data.match_radius_km));
        setTimeoutSeconds(String(data.request_timeout_seconds));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load fare settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      await updateFareSettings({
        base_fare: parseFloat(baseFare),
        base_distance_km: parseFloat(baseDistance),
        rate_per_km: parseFloat(ratePerKm),
        rate_per_extra_passenger: parseFloat(extraPassengerRate),
        match_radius_km: parseFloat(matchRadius),
        request_timeout_seconds: parseInt(timeoutSeconds, 10),
      });

      Alert.alert('Success', 'Fare configuration successfully updated across the system!');
      await loadSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to update fare settings');
    } finally {
      setSaving(false);
    }
  };

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
        <ErrorBanner message={error} />

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Tricycle Fare Structure (Makilala)</Text>
          <Text style={styles.sectionSubtitle}>
            These parameters dictate client and server authoritative fare calculations for all
            passenger bookings.
          </Text>

          <Input
            label="Base Fare (PHP ₱)"
            placeholder="15.00"
            keyboardType="decimal-pad"
            value={baseFare}
            onChangeText={setBaseFare}
            helperText="Minimum fare for the initial base distance"
          />

          <Input
            label="Base Distance Threshold (Kilometers)"
            placeholder="2.0"
            keyboardType="decimal-pad"
            value={baseDistance}
            onChangeText={setBaseDistance}
            helperText="Distance covered by the initial base fare"
          />

          <Input
            label="Rate Per Extra Kilometer (PHP ₱)"
            placeholder="8.00"
            keyboardType="decimal-pad"
            value={ratePerKm}
            onChangeText={setRatePerKm}
            helperText="Additional charge per km beyond base distance"
          />

          <Input
            label="Rate Per Extra Passenger (PHP ₱)"
            placeholder="5.00"
            keyboardType="decimal-pad"
            value={extraPassengerRate}
            onChangeText={setExtraPassengerRate}
            helperText="Surcharge per additional passenger (passenger 2 to 7)"
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Dispatch & Timeout Parameters</Text>

          <Input
            label="Driver Matching Radius (Kilometers)"
            placeholder="3.5"
            keyboardType="decimal-pad"
            value={matchRadius}
            onChangeText={setMatchRadius}
            helperText="Maximum distance to alert nearby available tricycles"
          />

          <Input
            label="Ride Request Timeout (Seconds)"
            placeholder="300"
            keyboardType="number-pad"
            value={timeoutSeconds}
            onChangeText={setTimeoutSeconds}
            helperText="Auto-cancel pending ride if unclaimed (default: 300s / 5 mins)"
          />
        </Card>

        <Button
          title="Save Fare Settings"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
