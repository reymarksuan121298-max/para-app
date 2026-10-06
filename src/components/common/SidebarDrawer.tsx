import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { typography, spacing, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/fareCalculator';
import { ProfileAvatar } from './ProfileAvatar';

interface SidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(width * 0.78, 320);

import { useThemeStore } from '../../store/themeStore';
import { useDriverStore } from '../../store/driverStore';
import { Switch } from 'react-native';
import { version as appVersion } from '../../../package.json';

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({ visible, onClose }) => {
  const navigation = useNavigation<any>();
  const { user, driver, signOut } = useAuthStore();
  const { isDarkMode, toggleTheme, colors } = useThemeStore();
  const { status: driverStatus, toggleOnline } = useDriverStore();
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const isDriver = user?.role === 'driver';
  const isOnline = driverStatus === 'online';

  // Keep the drawer mounted while it animates out. React Native removes modal
  // content the moment `visible` becomes false, so animating against `visible`
  // directly made the drawer pop away instead of sliding out.
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!rendered) return;

    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(slideAnim, {
      toValue: -SIDEBAR_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setRendered(false);
      }
    });
  }, [rendered, visible, slideAnim]);

  const handleNavigate = (screenName: string) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screenName);
    }, 150);
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
  };

  // Dynamic sidebar colors
  const sidebarBg = isDarkMode ? '#0F172A' : '#FFFFFF';
  const sidebarBorder = isDarkMode ? '#1E293B' : '#E2E8F0';
  const sidebarText = isDarkMode ? '#F8FAFC' : '#0F172A';
  const sidebarSubtext = isDarkMode ? '#94A3B8' : '#64748B';
  const avatarCircleBg = isDarkMode ? '#1E293B' : '#F0F9FF';

  return (
    <Modal visible={rendered} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sidebar,
            {
              backgroundColor: sidebarBg,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header Profile Section */}
          <View style={[styles.profileSection, { borderBottomColor: sidebarBorder }]}>
            <View style={{ marginBottom: spacing.sm }}>
              <ProfileAvatar size={66} editable={false} role={user?.role} />
            </View>
            <Text style={[styles.userName, { color: sidebarText }]}>{user?.name || 'PARA User'}</Text>
            <Text style={[styles.userRole, { color: sidebarSubtext }]}>
              {user?.role === 'admin'
                ? 'System Administrator'
                : isDriver
                ? `Driver • Plate: ${driver?.vehicle_number || 'N/A'}`
                : `Passenger • ${user?.phone || ''}`}
            </Text>

            {/* Driver Online / Offline Quick Toggle */}
            {isDriver && driver?.driver_id && (
              // One handler per touch target — see DriverDashboard header: the
              // Switch must not sit inside another pressable that toggles too.
              <View
                style={[
                  styles.driverStatusToggleBadge,
                  {
                    backgroundColor: isOnline ? (isDarkMode ? '#064E3B' : '#DCFCE7') : (isDarkMode ? '#1E293B' : '#F1F5F9'),
                    borderColor: isOnline ? (isDarkMode ? '#059669' : '#86EFAC') : (isDarkMode ? '#334155' : '#CBD5E1'),
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.driverStatusLeft}
                  onPress={() => toggleOnline(driver.driver_id)}
                  activeOpacity={0.85}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={[styles.driverStatusDot, { backgroundColor: isOnline ? '#22C55E' : '#94A3B8' }]} />
                  <Text style={[styles.driverStatusText, { color: isOnline ? (isDarkMode ? '#A7F3D0' : '#15803D') : sidebarSubtext }]}>
                    {isOnline ? 'ONLINE & READY' : 'OFFLINE'}
                  </Text>
                </TouchableOpacity>
                <Switch
                  value={isOnline}
                  onValueChange={() => toggleOnline(driver.driver_id)}
                  trackColor={{ false: isDarkMode ? '#334155' : '#CBD5E1', true: '#86EFAC' }}
                  thumbColor={isOnline ? '#15803D' : '#94A3B8'}
                  style={styles.driverSwitch}
                />
              </View>
            )}
          </View>

          {/* Navigation Links */}
          <View style={styles.menuItems}>
            {user?.role === 'admin' ? (
              <>
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('AdminDashboard')}
                >
                  <Text style={styles.menuIcon}>📊</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>System Overview</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('ManageUsers')}
                >
                  <Text style={styles.menuIcon}>👥</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>Manage Users & Drivers</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('ManageFares')}
                >
                  <Text style={styles.menuIcon}>⚙️</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>Fare Matrix Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('ManageLocations')}
                >
                  <Text style={styles.menuIcon}>📍</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>Locations & Landmarks</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('Reports')}
                >
                  <Text style={styles.menuIcon}>📜</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>System Reports</Text>
                </TouchableOpacity>
              </>
            ) : isDriver ? (
              <>
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('DriverDashboard')}
                >
                  <Text style={styles.menuIcon}>🛺</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>Driver Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('DriverEarnings')}
                >
                  <Text style={styles.menuIcon}>💰</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>Earnings & Trip History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('DriverProfile')}
                >
                  <Text style={styles.menuIcon}>⚙️</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>Driver Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('PassengerHome')}
                >
                  <Text style={styles.menuIcon}>🗺️</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>Map & Book Ride</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('RideHistory')}
                >
                  <Text style={styles.menuIcon}>📜</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>My Ride History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: sidebarBorder }]}
                  onPress={() => handleNavigate('PassengerProfile')}
                >
                  <Text style={styles.menuIcon}>👤</Text>
                  <Text style={[styles.menuLabel, { color: sidebarText }]}>Passenger Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer with Dark Mode Toggle, App Info and Logout */}
          <View style={[styles.footer, { borderTopColor: sidebarBorder }]}>
            {/* Dark Theme Toggle Row */}
            <View style={styles.themeToggleRow}>
              <View style={styles.themeLabelRow}>
                <Text style={styles.themeIcon}>{isDarkMode ? '🌙' : '☀️'}</Text>
                <Text style={[styles.themeLabel, { color: sidebarText }]}>
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                thumbColor={isDarkMode ? '#38BDF8' : '#F8FAFC'}
              />
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
            <Text style={[styles.versionText, { color: sidebarSubtext }]}>PARA Tricycle v{appVersion}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#0F172A',
    height: '100%',
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 16,
  },
  profileSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: '#0284C7',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  userRole: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  menuItems: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.5)',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: spacing.md,
  },
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  themeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  driverStatusToggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  driverStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  driverStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  driverSwitch: {
    transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }],
  },
});
