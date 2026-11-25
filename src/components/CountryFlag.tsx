import React from 'react';
import { Image, ImageStyle, StyleProp, Text } from 'react-native';

/**
 * Country flag shown next to language and country pickers.
 *
 * The flag images ship inside the app. The previous package (react-native-country-flag) loaded every
 * flag from flagcdn.com at runtime, which sent each user's IP address to a third party just to draw
 * a flag. Add a flag here when a new language or country is added.
 */
const FLAGS: Record<string, number> = {
  GB: require('../../assets/flags/gb.png'),
  DE: require('../../assets/flags/de.png'),
  FR: require('../../assets/flags/fr.png'),
  ES: require('../../assets/flags/es.png'),
  NL: require('../../assets/flags/nl.png'),
  PL: require('../../assets/flags/pl.png'),
  SE: require('../../assets/flags/se.png'),
  RS: require('../../assets/flags/rs.png'),
};

/** Flag emoji built from the ISO code, used when no image is bundled for it. Needs no network. */
function emojiFlag(isoCode: string): string {
  const code = isoCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

interface CountryFlagProps {
  isoCode: string;
  size: number;
  style?: StyleProp<ImageStyle>;
}

export default function CountryFlag({ isoCode, size, style }: CountryFlagProps) {
  const source = FLAGS[(isoCode || '').toUpperCase()];

  if (!source) {
    return <Text style={{ fontSize: size }}>{emojiFlag(isoCode || '')}</Text>;
  }

  // Same proportions as the old package (width = 1.6 x height).
  return <Image source={source} style={[{ width: size * 1.6, height: size }, style]} />;
}
