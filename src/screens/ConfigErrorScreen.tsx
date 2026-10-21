import React from 'react';
import { StyleSheet, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography, borderRadius, Colors } from '../theme';

/**
 * Shown instead of the app when the build has no Supabase configuration.
 *
 * This only happens when `.env` was missing at build time — the most common
 * cause of a release APK that cannot reach the backend. Failing loudly with the
 * exact missing keys beats silently pointing at an unrelated project.
 */
export const ConfigErrorScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.icon}>⚙️</Text>
        <Text style={styles.title}>App is not configured</Text>
        <Text style={styles.body}>
          This build is missing its Supabase connection settings, so sign-in and
          every data request would fail.
        </Text>
        <Text style={styles.body}>
          Add the following keys to the project{' '}
          <Text style={styles.code}>.env</Text> file and rebuild the app:
        </Text>
        <Text style={styles.codeBlock}>{'SUPABASE_URL=...\nSUPABASE_ANON_KEY=...'}</Text>
        <Text style={styles.hint}>
          Release builds must be compiled with .env present — it is not committed
          to version control.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.xl,
    },
    icon: {
      fontSize: 48,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    body: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    code: {
      ...typography.bodyBold,
      color: colors.primary,
    },
    codeBlock: {
      ...typography.caption,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
