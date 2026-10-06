import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export function isNativeImagePickerAvailable(): boolean {
  return !!(
    NativeModules.ImagePickerManager ||
    NativeModules.ImagePicker ||
    NativeModules.RNCImagePicker
  );
}

const options: ImageLibraryOptions & CameraOptions = {
  mediaType: 'photo',
  maxWidth: 600,
  maxHeight: 600,
  quality: 0.7,
  includeBase64: true,
};

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    if (alreadyGranted) return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Access Needed',
        message: 'PARA needs camera access so you can take your profile picture.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export async function pickImageFromCamera(): Promise<string | null> {
  if (!isNativeImagePickerAvailable()) {
    throw new Error(
      'The native camera module is not linked in your running build yet. Please rebuild the app (npm run android). In the meantime, you can select any Avatar preset below!'
    );
  }

  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw new Error(
        'Camera permission was denied. Please allow camera access in Android App Settings > Permissions, or choose from the avatar presets below.'
      );
    }

    const response: ImagePickerResponse = await launchCamera(options);
    if (response.didCancel) return null;
    if (response.errorMessage) throw new Error(response.errorMessage);

    const asset = response.assets?.[0];
    if (!asset) return null;

    if (asset.base64) {
      const mime = asset.type || 'image/jpeg';
      return `data:${mime};base64,${asset.base64}`;
    }
    return asset.uri || null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to capture photo';
    throw new Error(msg);
  }
}

export async function pickImageFromGallery(): Promise<string | null> {
  if (!isNativeImagePickerAvailable()) {
    throw new Error(
      'The photo gallery module is not linked in your running build yet. Please rebuild the app (npm run android). In the meantime, you can select any Avatar preset below!'
    );
  }

  try {
    const response: ImagePickerResponse = await launchImageLibrary(options);
    if (response.didCancel) return null;
    if (response.errorMessage) throw new Error(response.errorMessage);

    const asset = response.assets?.[0];
    if (!asset) return null;

    if (asset.base64) {
      const mime = asset.type || 'image/jpeg';
      return `data:${mime};base64,${asset.base64}`;
    }
    return asset.uri || null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to pick image from gallery';
    throw new Error(msg);
  }
}

export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
];
