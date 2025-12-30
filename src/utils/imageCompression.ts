import * as ImageManipulator from 'expo-image-manipulator';

interface ImageCompressionOptions {
  compress: number; // A number from 0 to 1, where 1 means no compression.
  format: ImageManipulator.SaveFormat; // ImageManipulator.SaveFormat.JPEG or ImageManipulator.SaveFormat.PNG
  maxWidth?: number; // Max width to resize to
  maxHeight?: number; // Max height to resize to
}

/**
 * Compresses an image given its URI.
 * @param uri The URI of the image to compress.
 * @param options Compression options (quality, format, maxWidth, maxHeight).
 * @returns The URI of the compressed image.
 */
export async function compressImageAsync(
  uri: string,
  options: ImageCompressionOptions = { compress: 0.2, format: ImageManipulator.SaveFormat.JPEG }
): Promise<string> {
  const actions: ImageManipulator.Action[] = [];
  
  if (options.maxWidth || options.maxHeight) {
    actions.push({
      resize: {
        width: options.maxWidth,
        height: options.maxHeight,
      },
    });
  }

  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    actions,
    {
      compress: options.compress,
      format: options.format,
      base64: false, // We'll convert to base64 separately
    }
  );

  return manipResult.uri;
}
