import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../api/supabaseClient';
import { SidebarDrawer } from '../../components/common/SidebarDrawer';
import { useTheme } from '../../hooks/useTheme';

export const DriverProfileScreen: React.FC = () => {
  const { user, driver, signOut, initializeAuth } = useAuthStore();
  const { colors } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Edit vehicle info modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState(driver?.vehicle_number || '');
  const [licenseNumber, setLicenseNumber] = useState(driver?.license_number || '');
  const [seatCapacity, setSeatCapacity] = useState(String(driver?.seat_capacity || 6));
  const [saving, setSaving] = useState(false);

  const handleOpenEdit = () => {
    setVehicleNumber(driver?.vehicle_number === 'PENDING' ? '' : (driver?.vehicle_number || ''));
    setLicenseNumber(driver?.license_number === 'PENDING' ? '' : (driver?.license_number || ''));
    setSeatCapacity(String(driver?.seat_capacity || 6));
    setEditModalVisible(true);
  };

  const handleSaveVehicleInfo = async () => {
    if (!driver?.driver_id) return;
    if (!vehicleNumber.trim()) {
      Alert.alert('Required', 'Please enter your Tricycle Plate or Body Number.');
      return;
    }
    if (!licenseNumber.trim()) {
      Alert.alert('Required', 'Please enter your Driver License Number.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('drivers')
        .update({
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          license_number: licenseNumber.trim().toUpperCase(),
          seat_capacity: parseInt(seatCapacity, 10) || 6,
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('driver_id', driver.driver_id);

      if (error) throw error;

      await initializeAuth();
      setEditModalVisible(false);
      Alert.alert('Success 🎉', 'Vehicle details updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update vehicle details');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of PARA Driver?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="Driver Profile"
        onMenu={() => setSidebarOpen(true)}
      />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIcon}>🛺</Text>
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name || 'Driver'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={styles.tagRow}>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>TRICYCLE DRIVER</Text>
            </View>
            <View style={styles.ratingTag}>
              <Text style={styles.ratingText}>★ {driver?.rating_avg?.toFixed(1) || '5.0'}</Text>
            </View>
          </View>
        </Card>

        {/* Tricycle & Association Info */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Tricycle Vehicle Information</Text>
          <TouchableOpacity onPress={handleOpenEdit} style={styles.editBtn}>
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plate / Body Number</Text>
            <Text style={[styles.infoValue, driver?.vehicle_number === 'PENDING' ? { color: colors.warning } : undefined]}>
              {driver?.vehicle_number || 'Not set'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Driver License Number</Text>
            <Text style={[styles.infoValue, driver?.license_number === 'PENDING' ? { color: colors.warning } : undefined]}>
              {driver?.license_number || 'Not set'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Maximum Seat Capacity</Text>
            <Text style={styles.infoValue}>{driver?.seat_capacity || 6} Passengers</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Operating Association</Text>
            <Text style={styles.infoValue}>MTDA (Makilala)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verification Status</Text>
            <Text style={[styles.infoValue, { color: colors.success }]}>
              {driver?.is_verified ? 'Verified Active' : 'Verified'}
            </Text>
          </View>
        </Card>

        {/* Contact Info */}
        <Text style={styles.sectionHeader}>Contact Details</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
          </View>
        </Card>

        {/* Sign Out */}
        <Button
          title="Log Out"
          variant="outline"
          onPress={handleSignOut}
          style={styles.signOutBtn}
        />
      </ScrollView>

      {/* Edit Vehicle Info Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Tricycle & License</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Plate or Body Number"
              placeholder="e.g. MK-1234 or BODY-089"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              autoCapitalize="characters"
            />

            <Input
              label="Driver License Number"
              placeholder="e.g. L01-23-456789"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              autoCapitalize="characters"
            />

            <Input
              label="Seat Capacity (Passengers)"
              placeholder="e.g. 6"
              value={seatCapacity}
              onChangeText={setSeatCapacity}
              keyboardType="number-pad"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCancelBtn}
              />
              <Button
                title="Save Changes"
                variant="primary"
                onPress={handleSaveVehicleInfo}
                loading={saving}
                style={styles.modalSaveBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.secondaryLight,
  },
  avatarIcon: {
    fontSize: 32,
  },
  userName: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  roleTag: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  roleText: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  ratingTag: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  ratingText: {
    ...typography.captionBold,
    color: colors.secondaryDark,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  editBtnText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 12,
  },
  infoCard: {
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
  signOutBtn: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.heading3,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalCloseText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalSaveBtn: {
    flex: 1,
  },
});
