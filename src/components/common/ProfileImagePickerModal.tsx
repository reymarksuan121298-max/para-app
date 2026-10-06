import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing, borderRadius, Colors } from '../../theme';
import {
  pickImageFromCamera,
  pickImageFromGallery,
  isNativeImagePickerAvailable,
  AVATAR_PRESETS,
} from '../../utils/imagePicker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectImage: (imageUriOrBase64: string | null) => Promise<void>;
  currentAvatarUrl?: string | null;
}

export const ProfileImagePickerModal: React.FC<Props> = ({
  visible,
  onClose,
  onSelectImage,
  currentAvatarUrl,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const nativeAvailable = isNativeImagePickerAvailable();

  const handleCamera = async () => {
    try {
      setLoading(true);
      const uri = await pickImageFromCamera();
      if (uri) {
        await onSelectImage(uri);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera error';
      Alert.alert('Camera Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGallery = async () => {
    try {
      setLoading(true);
      const uri = await pickImageFromGallery();
      if (uri) {
        await onSelectImage(uri);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gallery error';
      Alert.alert('Gallery Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = async (presetUrl: string) => {
    try {
      setLoading(true);
      await onSelectImage(presetUrl);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set avatar';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomUrl = async () => {
    const trimmed = customUrl.trim();
    if (!trimmed) {
      Alert.alert('Invalid URL', 'Please enter a valid image URL');
      return;
    }
    try {
      setLoading(true);
      await onSelectImage(trimmed);
      setCustomUrl('');
      setShowUrlInput(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set image URL';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await onSelectImage(null);
            onClose();
          } catch {
            Alert.alert('Error', 'Failed to remove profile photo');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Profile Photo</Text>
              <Text style={styles.subtitle}>Upload from device or pick an avatar</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Updating photo...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              {!nativeAvailable && (
                <View style={styles.rebuildNotice}>
                  <Text style={styles.rebuildNoticeText}>
                    ⚡ Native camera & gallery will be enabled after rebuilding the app (run "npm run android"). You can pick any instant Avatar preset below or paste an image URL right away!
                  </Text>
                </View>
              )}

              {/* Main Upload Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionCard} onPress={handleCamera}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={styles.actionIcon}>📸</Text>
                  </View>
                  <Text style={styles.actionTitle}>Take Photo</Text>
                  <Text style={styles.actionDesc}>Open Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={handleGallery}>
                  <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={styles.actionIcon}>🖼️</Text>
                  </View>
                  <Text style={styles.actionTitle}>Photo Library</Text>
                  <Text style={styles.actionDesc}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Web URL option toggle */}
              <TouchableOpacity
                style={styles.urlToggleRow}
                onPress={() => setShowUrlInput(!showUrlInput)}
              >
                <Text style={styles.urlToggleText}>
                  {showUrlInput ? '▼ Hide Image Link' : '▶ Enter Image Web Link / URL'}
                </Text>
              </TouchableOpacity>

              {showUrlInput && (
                <View style={styles.urlInputBox}>
                  <TextInput
                    style={styles.urlInput}
                    placeholder="https://example.com/avatar.jpg"
                    placeholderTextColor={colors.textMuted}
                    value={customUrl}
                    onChangeText={setCustomUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.urlApplyBtn}
                    onPress={handleApplyCustomUrl}
                  >
                    <Text style={styles.urlApplyText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Preset Avatars Section */}
              <Text style={styles.sectionTitle}>OR CHOOSE AN AVATAR</Text>
              <View style={styles.presetsGrid}>
                {AVATAR_PRESETS.map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.presetItem}
                    onPress={() => handleSelectPreset(url)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: url }} style={styles.presetImage} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Remove Photo */}
              {currentAvatarUrl && (
                <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
                  <Text style={styles.removeBtnText}>🗑️ Remove Current Photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    backdrop: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      maxHeight: '85%',
      paddingBottom: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    title: {
      ...typography.heading3,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    closeBtnText: {
      fontSize: 18,
      color: colors.textMuted,
    },
    scroll: {
      padding: spacing.lg,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    actionCard: {
      flex: 1,
      backgroundColor: colors.borderSubtle,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    actionIcon: {
      fontSize: 22,
    },
    actionTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      fontSize: 13,
    },
    actionDesc: {
      ...typography.caption,
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    urlToggleRow: {
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
    },
    urlToggleText: {
      ...typography.captionBold,
      color: colors.primaryDark,
      fontSize: 12,
    },
    urlInputBox: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    urlInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      color: colors.textPrimary,
      fontSize: 13,
      backgroundColor: colors.surface,
    },
    urlApplyBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
      borderRadius: borderRadius.md,
    },
    urlApplyText: {
      ...typography.captionBold,
      color: '#FFFFFF',
      fontSize: 12,
    },
    sectionTitle: {
      ...typography.captionBold,
      color: colors.textMuted,
      fontSize: 11,
      letterSpacing: 0.5,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    presetsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    presetItem: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.border,
    },
    presetImage: {
      width: '100%',
      height: '100%',
    },
    removeBtn: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
      marginTop: spacing.xs,
    },
    removeBtnText: {
      ...typography.captionBold,
      color: colors.danger,
      fontSize: 13,
    },
    loadingBox: {
      padding: spacing.xl * 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    rebuildNotice: {
      backgroundColor: '#FEF3C7',
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: '#FDE68A',
      marginBottom: spacing.md,
    },
    rebuildNoticeText: {
      ...typography.caption,
      color: '#92400E',
      fontSize: 11,
      lineHeight: 16,
    },
  });
