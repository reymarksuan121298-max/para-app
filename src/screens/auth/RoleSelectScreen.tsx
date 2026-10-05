import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { Header } from '../../components/common/Header';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelect'>;

export const RoleSelectScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Join PARA" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.title}>How would you like to use PARA?</Text>
        <Text style={styles.subtitle}>
          Select your account type to proceed with registration
        </Text>

        {/* Passenger Option */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.roleCard}
          onPress={() => navigation.navigate('Register', { defaultRole: 'passenger' })}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.roleIcon}>🙋</Text>
          </View>
          <View style={styles.roleDetails}>
            <Text style={styles.roleName}>I am a Passenger</Text>
            <Text style={styles.roleDesc}>
              Book tricycles, calculate fares, and track rides anywhere in Makilala.
            </Text>
          </View>
          <Text style={styles.chevron}>→</Text>
        </TouchableOpacity>

        {/* Driver Option */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.roleCard}
          onPress={() => navigation.navigate('Register', { defaultRole: 'driver' })}
        >
          <View style={[styles.iconCircle, styles.driverIconCircle]}>
            <Text style={styles.roleIcon}>🛺</Text>
          </View>
          <View style={styles.roleDetails}>
            <Text style={styles.roleName}>I am a Tricycle Driver</Text>
            <Text style={styles.roleDesc}>
              Receive ride requests, pick up passengers, and track daily earnings.
            </Text>
          </View>
          <Text style={styles.chevron}>→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  driverIconCircle: {
    backgroundColor: colors.warningBg,
  },
  roleIcon: {
    fontSize: 26,
  },
  roleDetails: {
    flex: 1,
  },
  roleName: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  roleDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
});
