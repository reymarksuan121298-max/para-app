import React, { useMemo, useState } from 'react';
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
import { useForm, useWatch } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { Header } from '../../components/common/Header';
import { FormInput } from '../../components/common/FormInput';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { signUpDriver, signUpPassenger } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { registerResolver, RegisterFormData } from '../../utils/validators';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const defaultRole = route.params?.defaultRole || 'passenger';
  const [role, setRole] = useState<'passenger' | 'driver'>(defaultRole);

  // The driver schema adds license / vehicle / seat capacity validation, so the
  // resolver is rebuilt whenever the selected role changes.
  const { control, handleSubmit, setValue } = useForm<RegisterFormData>({
    resolver: registerResolver(role),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      license_number: '',
      vehicle_number: '',
      seat_capacity: 6,
    },
    mode: 'onBlur',
  });
  const seatCapacity = useWatch({ control, name: 'seat_capacity' });

  const [loading, setLoading] = useState(false);
  // Server-side failures (duplicate email, network) live outside field validation.
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  const handleRegister = handleSubmit(async (values) => {
    try {
      setLoading(true);
      setSubmitError(null);

      if (role === 'passenger') {
        await signUpPassenger({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          password: values.password,
        });
      } else {
        await signUpDriver({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          password: values.password,
          license_number: (values.license_number ?? '').trim(),
          vehicle_number: (values.vehicle_number ?? '').trim(),
          seat_capacity: values.seat_capacity ?? 6,
        });
      }

      await initializeAuth();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  });

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

          <ErrorBanner message={submitError} />

          {/* Personal Info */}
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <FormInput
            control={control}
            name="name"
            label="Full Name"
            placeholder="e.g. Maria Santos"
          />
          <FormInput
            control={control}
            name="email"
            label="Email Address"
            placeholder="e.g. maria@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormInput
            control={control}
            name="phone"
            label="Mobile Phone Number"
            placeholder="e.g. 09171234567"
            keyboardType="phone-pad"
          />
          <FormInput
            control={control}
            name="password"
            label="Password"
            placeholder="Minimum 6 characters"
            secureTextEntry
          />

          {/* Driver specific info */}
          {role === 'driver' && (
            <View style={styles.driverSection}>
              <Text style={styles.sectionTitle}>Tricycle & License Details</Text>

              <FormInput
                control={control}
                name="license_number"
                label="Driver's License Number"
                placeholder="e.g. N01-12-345678"
                autoCapitalize="characters"
              />

              <FormInput
                control={control}
                name="vehicle_number"
                label="Tricycle Body / Plate Number"
                placeholder="e.g. MKL-1234"
                autoCapitalize="characters"
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
                    onPress={() => setValue('seat_capacity', cap)}
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

const makeStyles = (colors: Colors) => StyleSheet.create({
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
