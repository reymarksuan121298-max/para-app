import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { borderRadius, typography, spacing, Colors } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';
import { ErrorBanner } from './ErrorBanner';

interface OtpVerificationModalProps {
  visible: boolean;
  email: string;
  expectedOtp: string;
  isMock?: boolean;
  onSuccess: () => Promise<void> | void;
  onResend: () => Promise<string | null>; // Returns the newly generated OTP or null
  onClose: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  visible,
  email,
  expectedOtp,
  isMock = false,
  onSuccess,
  onResend,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [otpInput, setOtpInput] = useState('');
  const [currentExpectedOtp, setCurrentExpectedOtp] = useState(expectedOtp);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  // Sync initial expected OTP
  useEffect(() => {
    setCurrentExpectedOtp(expectedOtp);
  }, [expectedOtp]);

  // Resend cooldown timer
  useEffect(() => {
    if (!visible) {
      setOtpInput('');
      setErrorMessage(null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      return;
    }

    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, cooldown]);

  const handleVerify = async () => {
    const trimmed = otpInput.trim();
    if (trimmed.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    if (trimmed !== currentExpectedOtp) {
      setErrorMessage('Incorrect verification code. Please try again.');
      return;
    }

    try {
      setVerifying(true);
      setErrorMessage(null);
      await onSuccess();
    } catch (err) {
      setErrorMessage(err instanceof Error && err.message ? err.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    try {
      setResending(true);
      setErrorMessage(null);
      const newOtp = await onResend();
      if (newOtp) {
        setCurrentExpectedOtp(newOtp);
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setOtpInput('');
      }
    } catch (err) {
      setErrorMessage('Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <Text style={styles.icon}>✉️</Text>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit verification code sent to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {isMock && (
            <View style={styles.devBanner}>
              <Text style={styles.devBannerText}>
                🧪 Test Mode Code: <Text style={styles.devCode}>{currentExpectedOtp}</Text>
              </Text>
            </View>
          )}

          <ErrorBanner message={errorMessage} />

          <TextInput
            style={styles.otpInput}
            value={otpInput}
            onChangeText={(text) => {
              setOtpInput(text.replace(/[^0-9]/g, '').slice(0, 6));
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="000000"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <View style={styles.resendContainer}>
            {cooldown > 0 ? (
              <Text style={styles.cooldownText}>
                Resend code in <Text style={styles.cooldownBold}>{cooldown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.resendLink}>Resend Code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Button
            title="Create Account"
            onPress={handleVerify}
            loading={verifying}
            disabled={otpInput.trim().length !== 6 || verifying}
            style={styles.verifyBtn}
          />

          <TouchableOpacity onPress={onClose} disabled={verifying} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 8,
    },
    icon: {
      fontSize: 42,
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    emailHighlight: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    devBanner: {
      backgroundColor: colors.card,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    devBannerText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    devCode: {
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 2,
    },
    otpInput: {
      width: '100%',
      height: 56,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background,
      color: colors.textPrimary,
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 8,
      marginBottom: spacing.md,
    },
    resendContainer: {
      marginBottom: spacing.lg,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cooldownText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    cooldownBold: {
      color: colors.primary,
      fontWeight: '600',
    },
    resendLink: {
      ...typography.bodyBold,
      color: colors.primary,
    },
    verifyBtn: {
      width: '100%',
      marginBottom: spacing.sm,
    },
    cancelBtn: {
      paddingVertical: spacing.xs,
    },
    cancelText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
