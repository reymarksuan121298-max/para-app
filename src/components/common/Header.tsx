import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { typography, spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onMenu?: () => void;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  onMenu,
  rightElement,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.leftRow}>
        {onMenu && (
          <TouchableOpacity onPress={onMenu} style={styles.menuButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.menuIcon, { color: colors.textPrimary }]}>☰</Text>
          </TouchableOpacity>
        )}
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.backArrow, { color: colors.textPrimary }]}>←</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement && <View style={styles.rightContainer}>{rightElement}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  menuIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  backArrow: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    ...typography.heading3,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
