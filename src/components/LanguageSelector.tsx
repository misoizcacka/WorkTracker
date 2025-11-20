import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountryFlag from "react-native-country-flag";
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

const LANGUAGES = [
  { code: 'en', label: 'English', countryCode: 'GB' },
  { code: 'sv', label: 'Svenska', countryCode: 'SE' },
  { code: 'sr', label: 'Srpski', countryCode: 'RS' },
  { code: 'de', label: 'Deutsch', countryCode: 'DE' },
];

export function LanguageSelector() {
  const { top } = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language.split('-')[0]);
  const fadeAnim = useRef(new Animated.Value(0)).current; // Initial value for opacity: 0
  const scaleAnim = useRef(new Animated.Value(0.9)).current; // Initial value for scale: 0.9

  const togglePopover = () => {
    if (popoverVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => setPopoverVisible(false));
    } else {
      setPopoverVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setCurrentLanguage(langCode);
    togglePopover(); // Close popover after selection
  };

  const currentLang = LANGUAGES.find(lang => lang.code === currentLanguage) || LANGUAGES[0];

  return (
    <View style={[styles.container, { top: top + 10 }]}>
      <TouchableOpacity onPress={togglePopover} style={styles.button}>
        <CountryFlag isoCode={currentLang.countryCode} size={24} style={styles.flag} />
      </TouchableOpacity>

      {popoverVisible && (
        <Animated.View style={[styles.popoverContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={styles.langOption}
              onPress={() => handleLanguageChange(lang.code)}>
              <CountryFlag isoCode={lang.countryCode} size={24} style={styles.langFlag} />
              <Text style={styles.langLabel}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 10,
    zIndex: 1000, // Ensure it's above other content
  },
  button: {
    padding: 2, // Reduced padding for a thinner border appearance
    borderRadius: 50,
    backgroundColor: 'transparent', // Make background transparent to show only the border
    borderWidth: 1,
    borderColor: theme.colors.cardBackground,
  },
  flag: {
    width: 24,
    height: 24,
    borderRadius: 12, // Make it rounded
  },
  popoverContent: {
    position: 'absolute',
    top: 50, // Position below the button
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    shadowColor: theme.shadow.soft.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 180,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  langFlag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
  },
  langLabel: {
    fontSize: 16,
    color: theme.colors.bodyText,
  },
});


