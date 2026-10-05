import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, typography } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', style }) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successBg, text: colors.success };
      case 'warning':
        return { bg: colors.warningBg, text: colors.warning };
      case 'danger':
        return { bg: colors.dangerBg, text: colors.danger };
      case 'info':
        return { bg: colors.infoBg, text: colors.info };
      case 'neutral':
        return { bg: colors.borderSubtle, text: colors.textSecondary };
      case 'primary':
      default:
        return { bg: colors.primarySubtle, text: colors.primaryDark };
    }
  };

  const { bg, text } = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
