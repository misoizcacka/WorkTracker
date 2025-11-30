import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
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
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePopover} style={styles.button}>
        <CountryFlag isoCode={currentLang.countryCode} size={24} style={styles.flag} />
        <Text style={styles.currentLangLabel}>{currentLang.label}</Text>
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
    position: 'relative', // Changed to relative
    alignSelf: 'flex-start', // Align to start
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
  },
  flag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  currentLangLabel: {
    fontSize: 16,
    color: theme.colors.bodyText,
    fontWeight: '500',
  },
  popoverContent: {
    position: 'absolute',
    top: '100%', // Position below the button
    right: 0,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    padding: 5,
    shadowColor: theme.shadow.soft.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 180,
    zIndex: 1000, // Ensure it's above other content when open
    marginTop: 5,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
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


