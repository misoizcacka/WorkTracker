import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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

/**
 * Horizontal tab bar rendered at the top of pages that belong to a sidebar group.
 * Matches active state by checking if the current pathname starts with each item's href.
 */
const SubNavBar: React.FC<SubNavBarProps> = ({ items }) => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <TouchableOpacity
              key={item.href}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => router.push(item.href as any)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabText, isActive && styles.activeTabText]}
                fontType={isActive ? 'bold' : 'regular'}
              >
                {item.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: theme.spacing(2),
    flexDirection: 'row',
    gap: theme.spacing(0.5),
  },
  tab: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.5),
    position: 'relative',
    alignItems: 'center',
  },
  activeTab: {
    // active indicator is the bottom border line
  },
  tabText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: theme.spacing(2),
    right: theme.spacing(2),
    height: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
  },
});

export default SubNavBar;
