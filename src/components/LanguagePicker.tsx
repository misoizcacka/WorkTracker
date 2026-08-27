import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Themed';
import { theme } from '../theme';
import { SUPPORTED_LANGUAGES, changeLanguage, type LanguageCode } from '../i18n';

const FLAGS: Record<LanguageCode, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  nl: '🇳🇱',
  pl: '🇵🇱',
  sv: '🇸🇪',
};

export function LanguagePicker() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const currentCode = (SUPPORTED_LANGUAGES.some(l => l.code === i18n.language)
    ? i18n.language
    : 'en') as LanguageCode;

  const current = SUPPORTED_LANGUAGES.find(l => l.code === currentCode)!;

  const handleSelect = (code: LanguageCode) => {
    setOpen(false);
    changeLanguage(code);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.flag}>{FLAGS[currentCode]}</Text>
        <Text style={styles.triggerLabel} fontType="regular">{current.label}</Text>
        <Ionicons name="chevron-down" size={12} color={theme.colors.disabledText} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.dropdown}>
            {SUPPORTED_LANGUAGES.map(lang => {
              const isActive = lang.code === currentCode;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.option, isActive && styles.optionActive]}
                  onPress={() => handleSelect(lang.code as LanguageCode)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.flag}>{FLAGS[lang.code as LanguageCode]}</Text>
                    <Text
                      style={[styles.optionLabel, isActive && styles.optionLabelActive]}
                      fontType={isActive ? 'medium' : 'regular'}
                    >
                      {lang.label}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark" size={14} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.75),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  flag: {
    fontSize: 14,
    lineHeight: 18,
  },
  triggerLabel: {
    fontSize: 13,
    color: theme.colors.bodyText,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        justifyContent: 'center',
        alignItems: 'center',
      } as any,
    }),
  },
  dropdown: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    overflow: 'hidden',
    margin: theme.spacing(2),
    ...Platform.select({
      web: {
        minWidth: 180,
        margin: 0,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      } as any,
    }),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(2.5),
    paddingVertical: theme.spacing(1.75),
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  optionActive: {
    backgroundColor: theme.colors.primaryMuted,
  },
  optionLabel: {
    fontSize: 15,
    color: theme.colors.bodyText,
  },
  optionLabelActive: {
    color: theme.colors.primary,
  },
});
