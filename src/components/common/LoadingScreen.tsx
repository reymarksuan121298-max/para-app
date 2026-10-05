import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { typography, spacing, Colors } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface LoadingScreenProps {
  message?: string;
}

/**
 * Full-screen, theme-aware loading state for screens that have no content yet.
 *
 * Prefer this over `LoadingOverlay` when the loading state IS the whole screen:
 * `LoadingOverlay` is a transparent modal, so over an empty screen it leaks the
 * app background through and flashes in the wrong theme.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    message: {
      ...typography.body,
      marginTop: spacing.md,
      textAlign: 'center',
    },
  });
