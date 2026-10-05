import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';

interface ErrorBannerProps {
  message?: string | null;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    flex: 1,
    ...typography.caption,
    color: colors.danger,
  },
  retryBtn: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.danger,
    borderRadius: borderRadius.sm,
  },
  retryText: {
    ...typography.captionBold,
    color: colors.white,
  },
});
