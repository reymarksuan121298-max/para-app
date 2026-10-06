import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors, borderRadius } from '../../theme';
import { UserRole } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { updateUserProfileAvatar } from '../../api/auth';
import { ProfileImagePickerModal } from './ProfileImagePickerModal';

interface Props {
  userId?: string;
  avatarUrl?: string | null;
  role?: UserRole;
  size?: number;
  editable?: boolean;
  onAvatarUpdated?: (newUrl: string | null) => void;
}

export const ProfileAvatar: React.FC<Props> = ({
  userId,
  avatarUrl,
  role = 'passenger',
  size = 72,
  editable = false,
  onAvatarUpdated,
}) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const styles = React.useMemo(() => makeStyles(colors, size), [colors, size]);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const effectiveUserId = userId || user?.user_id;
  const effectiveAvatar = avatarUrl !== undefined ? avatarUrl : user?.avatar_url;

  const defaultEmoji = role === 'admin' ? '🛡️' : role === 'driver' ? '🛺' : '👤';

  const handleUpdateAvatar = async (newUrl: string | null) => {
    if (!effectiveUserId) {
      Alert.alert('Error', 'User ID not found');
      return;
    }

    try {
      const updatedUser = await updateUserProfileAvatar(effectiveUserId, newUrl);
      if (user && user.user_id === effectiveUserId) {
        setUser({ ...user, avatar_url: newUrl || undefined });
      }
      onAvatarUpdated?.(newUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile photo';
      Alert.alert('Update Failed', msg);
      throw err;
    }
  };

  const renderContent = () => {
    if (effectiveAvatar) {
      return (
        <Image
          source={{ uri: effectiveAvatar }}
          style={styles.image}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.fallbackBox}>
        <Text style={styles.fallbackEmoji}>{defaultEmoji}</Text>
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        disabled={!editable}
        onPress={() => setModalVisible(true)}
        activeOpacity={editable ? 0.8 : 1}
      >
        <View style={styles.avatarCircle}>{renderContent()}</View>

        {editable && (
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeIcon}>📷</Text>
          </View>
        )}
      </TouchableOpacity>

      {editable && (
        <ProfileImagePickerModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSelectImage={handleUpdateAvatar}
          currentAvatarUrl={effectiveAvatar}
        />
      )}
    </>
  );
};

const makeStyles = (colors: Colors, size: number) =>
  StyleSheet.create({
    container: {
      width: size,
      height: size,
      position: 'relative',
    },
    avatarCircle: {
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: 'hidden',
      borderWidth: 2.5,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    fallbackBox: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primarySubtle || '#F0FDF4',
    },
    fallbackEmoji: {
      fontSize: size * 0.45,
    },
    editBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: Math.max(24, size * 0.35),
      height: Math.max(24, size * 0.35),
      borderRadius: Math.max(12, size * 0.175),
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
    editBadgeIcon: {
      fontSize: Math.max(12, size * 0.18),
    },
  });
