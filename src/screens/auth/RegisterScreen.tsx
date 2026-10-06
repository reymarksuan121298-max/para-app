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
import { OtpVerificationModal } from '../../components/common/OtpVerificationModal';
import { sendOtpEmail } from '../../api/emailService';
import { generateOtp } from '../../utils/otp';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const defaultRole = route.params?.defaultRole || 'passenger';
  const [role, setRole] = useState<'passenger' | 'driver'>(defaultRole);

  // OTP Verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [expectedOtp, setExpectedOtp] = useState('');
  const [isMockOtp, setIsMockOtp] = useState(false);
  const [pendingValues, setPendingValues] = useState<RegisterFormData | null>(null);

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

  // Step 1: Validate form, generate OTP, send email via EmailJS, and show OTP modal
  const handleRegister = handleSubmit(async (values) => {
    try {
      setLoading(true);
      setSubmitError(null);

      const otp = generateOtp();
      const sendResult = await sendOtpEmail({
        toEmail: values.email.trim(),
        toName: values.name.trim(),
        otpCode: otp,
        role,
      });

      if (!sendResult.success) {
        setSubmitError(sendResult.message || 'Failed to send OTP verification email.');
        return;
      }

      setPendingValues(values);
      setExpectedOtp(otp);
      setIsMockOtp(!!sendResult.isMock);
      setShowOtpModal(true);
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : 'Failed to initiate registration');
    } finally {
      setLoading(false);
    }
  });

  // Step 2: Once OTP is verified in modal, create the account
  const handleOtpVerified = async () => {
    if (!pendingValues) return;

    if (role === 'passenger') {
      await signUpPassenger({
        name: pendingValues.name.trim(),
        email: pendingValues.email.trim(),
        phone: pendingValues.phone.trim(),
        password: pendingValues.password,
      });
    } else {
      await signUpDriver({
        name: pendingValues.name.trim(),
        email: pendingValues.email.trim(),
        phone: pendingValues.phone.trim(),
        password: pendingValues.password,
        license_number: (pendingValues.license_number ?? '').trim(),
        vehicle_number: (pendingValues.vehicle_number ?? '').trim(),
        seat_capacity: pendingValues.seat_capacity ?? 6,
      });
    }

    setShowOtpModal(false);
    await initializeAuth();
  };

  // Step 3: Resend OTP via EmailJS
  const handleResendOtp = async (): Promise<string | null> => {
    if (!pendingValues) return null;

    const newOtp = generateOtp();
    const sendResult = await sendOtpEmail({
      toEmail: pendingValues.email.trim(),
      toName: pendingValues.name.trim(),
      otpCode: newOtp,
      role,
    });

    if (!sendResult.success) {
      setSubmitError(sendResult.message || 'Failed to resend code');
      return null;
    }

    setExpectedOtp(newOtp);
    setIsMockOtp(!!sendResult.isMock);
    return newOtp;
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

      <OtpVerificationModal
        visible={showOtpModal}
        email={pendingValues?.email || ''}
        expectedOtp={expectedOtp}
        isMock={isMockOtp}
        onSuccess={handleOtpVerified}
        onResend={handleResendOtp}
        onClose={() => setShowOtpModal(false)}
      />
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
