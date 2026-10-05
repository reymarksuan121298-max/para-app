import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, borderRadius, typography } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = styles.base;

    // Size
    if (size === 'sm') base = { ...base, paddingVertical: 8, paddingHorizontal: 14 };
    else if (size === 'lg') base = { ...base, paddingVertical: 16, paddingHorizontal: 24 };
    else base = { ...base, paddingVertical: 12, paddingHorizontal: 18 };

    // Variant
    switch (variant) {
      case 'secondary':
        base = { ...base, backgroundColor: colors.secondary };
        break;
      case 'danger':
        base = { ...base, backgroundColor: colors.danger };
        break;
      case 'outline':
        base = {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
        break;
      case 'ghost':
        base = { ...base, backgroundColor: 'transparent' };
        break;
      case 'primary':
      default:
        base = { ...base, backgroundColor: colors.primary };
        break;
    }

    if (disabled || loading) {
      base = { ...base, opacity: 0.6 };
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    let color = colors.white;
    if (variant === 'outline' || variant === 'ghost') {
      color = colors.primary;
    }
    return {
      ...typography.bodyBold,
      color,
      fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), icon ? { marginLeft: 8 } : undefined, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
});
