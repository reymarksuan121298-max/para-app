import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { signUpDriver, signUpPassenger } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ route, navigation }) => {
  const defaultRole = route.params?.defaultRole || 'passenger';
  const [role, setRole] = useState<'passenger' | 'driver'>(defaultRole);

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Driver-specific fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [seatCapacity, setSeatCapacity] = useState<number>(6);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError('Please fill in all personal information fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (role === 'passenger') {
        await signUpPassenger({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        });
      } else {
        if (!licenseNumber.trim() || !vehicleNumber.trim()) {
          setError('Please provide your driver license and vehicle details');
          setLoading(false);
          return;
        }

        await signUpDriver({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          license_number: licenseNumber.trim(),
          vehicle_number: vehicleNumber.trim(),
          seat_capacity: seatCapacity,
        });
      }

      await initializeAuth();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Create Account" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Role Segmented Switch */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, role === 'passenger' && styles.segmentBtnActive]}
              onPress={() => setRole('passenger')}
            >
              <Text
                style={[
                  styles.segmentText,
                  role === 'passenger' && styles.segmentTextActive,
                ]}
              >
                🙋 Passenger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, role === 'driver' && styles.segmentBtnActive]}
              onPress={() => setRole('driver')}
            >
              <Text
                style={[
                  styles.segmentText,
                  role === 'driver' && styles.segmentTextActive,
                ]}
              >
                🛺 Driver
              </Text>
            </TouchableOpacity>
          </View>

          <ErrorBanner message={error} />

          {/* Personal Info */}
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <Input
            label="Full Name"
            placeholder="e.g. Maria Santos"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="Email Address"
            placeholder="e.g. maria@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Mobile Phone Number"
            placeholder="e.g. 09171234567"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            label="Password"
            placeholder="Minimum 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Driver specific info */}
          {role === 'driver' && (
            <View style={styles.driverSection}>
              <Text style={styles.sectionTitle}>Tricycle & License Details</Text>

              <Input
                label="Driver's License Number"
                placeholder="e.g. N01-12-345678"
                autoCapitalize="characters"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
              />

              <Input
                label="Tricycle Body / Plate Number"
                placeholder="e.g. MKL-1234"
                autoCapitalize="characters"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
              />

              <Text style={styles.capacityLabel}>Seat Capacity (5 to 7 passengers)</Text>
              <View style={styles.capacitySelector}>
                {[5, 6, 7].map((cap) => (
                  <TouchableOpacity
                    key={cap}
                    style={[
                      styles.capBtn,
                      seatCapacity === cap && styles.capBtnActive,
                    ]}
                    onPress={() => setSeatCapacity(cap)}
                  >
                    <Text
                      style={[
                        styles.capText,
                        seatCapacity === cap && styles.capTextActive,
                      ]}
                    >
                      {cap} Seats
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Button
            title={`Register as ${role === 'passenger' ? 'Passenger' : 'Driver'}`}
            onPress={handleRegister}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.borderSubtle,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primaryDark,
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  driverSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  capacityLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  capacitySelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  capBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  capBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  capText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  capTextActive: {
    color: colors.primaryDark,
  },
  submitBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
});
