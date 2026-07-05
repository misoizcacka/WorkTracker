import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 1200;
const QUALITY = 0.7;

async function compressWeb(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = reject;
    img.src = uri;
  });
}

async function compressNative(uri: string): Promise<string> {
  const actions: ImageManipulator.Action[] = [];
  // Only resize if needed — expo-image-manipulator preserves aspect ratio with width only
  actions.push({ resize: { width: MAX_WIDTH } });
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

export async function compressImageAsync(uri: string): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      return await compressWeb(uri);
    }
    return await compressNative(uri);
  } catch (e) {
    console.warn('Image compression failed, using original:', e);
    return uri;
  }
}
