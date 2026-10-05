import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { borderRadius, spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'elevated',
}) => {
  const { colors } = useTheme();

  const getStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'flat':
        return {
          backgroundColor: colors.borderSubtle,
        };
      case 'elevated':
      default:
        return styles.elevated;
    }
  };

  const dynamicCardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.card, dynamicCardStyle, getStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, dynamicCardStyle, getStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  outlined: {
    borderWidth: 1,
  },
  flat: {},
});
