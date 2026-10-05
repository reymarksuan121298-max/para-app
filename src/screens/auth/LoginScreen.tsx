import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { signInWithEmail } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signInWithEmail(email.trim(), password);
      await initializeAuth();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>PARA</Text>
            <Text style={styles.tagline}>
              Philippine Ride-Hailing App for Tricycles
            </Text>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.instructions}>Sign in to your account</Text>

            <ErrorBanner message={error} />

            <Input
              label="Email Address"
              placeholder="e.g. juan@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.signInBtn}
            />

            {/* Registration link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('RoleSelect')}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
    marginBottom: spacing.sm,
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  appName: {
    ...typography.heading1,
    color: colors.primaryDark,
    letterSpacing: 2,
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  welcomeText: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  instructions: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  signInBtn: {
    marginTop: spacing.sm,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerPrompt: {
    ...typography.body,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});
