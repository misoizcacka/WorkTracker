import { Image, View, StyleSheet, Pressable, Linking } from 'react-native';
import { Link } from 'expo-router';

const APPLE_STORE_URL = 'https://apps.apple.com/us/app/expo-go/id1394474753'; // Link to Expo Go on App Store
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=host.exp.exponent'; // Link to Expo Go on Google Play

const APPLE_BADGE_IMG = 'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg';
const GOOGLE_BADGE_IMG = 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';

export function StoreButtons() {
  const handlePress = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log(`Don't know how to open this URL: ${url}`);
      }
    });
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => handlePress(APPLE_STORE_URL)} style={styles.button}>
        <Image source={{ uri: APPLE_BADGE_IMG }} style={styles.appleImage} resizeMode="contain" />
      </Pressable>
      <Pressable onPress={() => handlePress(GOOGLE_PLAY_URL)} style={styles.button}>
        <Image source={{ uri: GOOGLE_BADGE_IMG }} style={styles.googleImage} resizeMode="contain" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  button: {
    marginHorizontal: 10,
  },
  appleImage: {
    width: 120,
    height: 40,
  },
  googleImage: {
    width: 135,
    height: 52, // Adjusted for aspect ratio of the badge
  },
});
