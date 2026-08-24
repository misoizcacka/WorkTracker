import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { theme } from '../theme';
import { Text } from './Themed';

export interface SubNavItem {
  label: string;
  href: string;
}

interface SubNavBarProps {
  items: SubNavItem[];
}

// Expo Router strips route group segments like "(manager)" from the URL.
// e.g. "/(manager)/projects" → "/projects" to match against pathname.
const stripGroup = (href: string) => href.replace(/\/\([^)]+\)/g, '');

interface TabItemProps {
  item: SubNavItem;
  isActive: boolean;
  onPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ item, isActive, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.tab,
        isActive ? styles.tabActive : styles.tabInactive,
        hovered && !isActive && styles.tabHovered,
      ]}
      // @ts-ignore — onMouseEnter/Leave are valid on React Native Web
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Text
        fontType={isActive ? 'bold' : 'regular'}
        style={[
          isActive ? styles.labelActive : styles.labelInactive,
          hovered && !isActive && styles.labelHovered,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
};

const SubNavBar: React.FC<SubNavBarProps> = ({ items }) => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => {
          const isActive = pathname.startsWith(stripGroup(item.href));
          return (
            <TabItem
              key={item.href}
              item={item}
              isActive={isActive}
              onPress={() => router.push(item.href as any)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing(2),
  },
  tab: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.5),
    marginBottom: -1,
    borderBottomWidth: 3,
    borderRadius: 0,
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabInactive: {
    borderBottomColor: 'transparent',
  },
  tabHovered: {
    borderBottomColor: theme.colors.primaryMuted,
    backgroundColor: theme.colors.primaryMuted,
  },
  labelActive: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
  labelInactive: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  labelHovered: {
    color: theme.colors.primary,
  },
});

export default SubNavBar;
