import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { theme } from '../../../theme';
import { useSession } from '../../../context/AuthContext';
import { Text } from '../../../components/Themed';
import { Logo } from '~/components/Logo';

const SIDEBAR_COLLAPSED_WIDTH = 64;
const SIDEBAR_EXPANDED_WIDTH = 240;

interface SidebarItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href: string;
  isActive: boolean;
  isExpanded: boolean;
}

const SidebarItem = ({ icon, label, href, isActive, isExpanded }: SidebarItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={href as any} asChild>
      <Pressable 
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={StyleSheet.flatten([
          styles.item, 
          isActive && styles.activeItem,
          isHovered && !isActive && styles.hoveredItem,
          !isExpanded && styles.collapsedItem
        ])}
      >
        <Ionicons 
          name={icon} 
          size={22} 
          color={isActive ? theme.colors.primary : (isHovered ? theme.colors.headingText : theme.colors.iconColor)} 
        />
        {isExpanded && (
          <Text 
            numberOfLines={1} 
            fontType={isActive ? "bold" : "regular"}
            style={StyleSheet.flatten([
              styles.label, 
              isActive && styles.activeLabel,
              isHovered && !isActive && styles.hoveredLabel
            ])}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Link>
  );
};

export const ManagerSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSignOutHovered, setIsSignOutHovered] = useState(false);
  const animation = useRef(new Animated.Value(SIDEBAR_COLLAPSED_WIDTH)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;
  const fullOpacity = useRef(new Animated.Value(0)).current;
  const pathname = usePathname();
  const { signOut } = useSession();

  const toggleSidebar = (expand: boolean) => {
    setIsExpanded(expand);
    Animated.parallel([
      Animated.spring(animation, {
        toValue: expand ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
        useNativeDriver: false,
        friction: 7,
        tension: 50,
      }),
      Animated.timing(iconOpacity, {
        toValue: expand ? 0 : 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fullOpacity, {
        toValue: expand ? 1 : 0,
        duration: 200,
        delay: expand ? 80 : 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Paths that belong to each top-level group — so "Team" is active on any Team sub-page
  const teamPaths = ['/(manager)/employees', '/(manager)/worker-assignments', '/(manager)/corrections'];
  const locationPaths = ['/(manager)/projects', '/(manager)/common-locations', '/(manager)/map-overview', '/(manager)/location-replay'];

  const isNavItemActive = (href: string): boolean => {
    if (href === '/(manager)/employees') return teamPaths.some(p => pathname.startsWith(p));
    if (href === '/(manager)/projects') return locationPaths.some(p => pathname.startsWith(p));
    return pathname.startsWith(href);
  };

  const navItems = [
    { icon: 'home-outline', label: 'Home', href: '/(manager)/dashboard' },
    { icon: 'people-outline', label: 'Team', href: '/(manager)/employees' },
    { icon: 'map-outline', label: 'Locations', href: '/(manager)/projects' },
    { icon: 'document-text-outline', label: 'Reports', href: '/(manager)/reports' },
    { icon: 'person-circle-outline', label: 'Account', href: '/(manager)/account' },
  ];

  const handleMouseEnter = () => {
    if (Platform.OS === 'web') toggleSidebar(true);
  };

  const handleMouseLeave = () => {
    if (Platform.OS === 'web') toggleSidebar(false);
  };

  return (
    <View style={{ width: SIDEBAR_COLLAPSED_WIDTH, zIndex: 100, backgroundColor: theme.colors.cardBackground }}>
      <Animated.View 
        style={StyleSheet.flatten([
          styles.container, 
          { 
            width: animation,
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            elevation: isExpanded ? 10 : 0,
            shadowColor: '#000',
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: isExpanded ? 0.1 : 0,
            shadowRadius: 10,
          }
        ])}
        // @ts-ignore
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <View style={styles.topSection}>
          <Link href="/(manager)/dashboard" asChild>
            <Pressable style={styles.logoContainer}>
              {/* K icon centered in collapsed 64px bar — fades out on expand */}
              <Animated.View style={[styles.logoIcon, { opacity: iconOpacity }]}>
                <Logo variant="icon" />
              </Animated.View>
              {/* Full logo left-aligned with nav items — fades in on expand */}
              <Animated.View style={[styles.logoFull, { opacity: fullOpacity }]}>
                <Logo variant="full" size="medium" />
              </Animated.View>
            </Pressable>
          </Link>

          <View style={styles.navContainer}>
            {navItems.map((item) => (
              <SidebarItem 
                key={item.href}
                icon={item.icon as any}
                label={item.label}
                href={item.href}
                isActive={isNavItemActive(item.href)}
                isExpanded={isExpanded}
              />
            ))}
          </View>
        </View>

        <View style={styles.bottomSection}>
          <Pressable 
            onPress={() => signOut()}
            onHoverIn={() => setIsSignOutHovered(true)}
            onHoverOut={() => setIsSignOutHovered(false)}
            style={StyleSheet.flatten([
              styles.item, 
              isSignOutHovered && styles.hoveredItem,
              !isExpanded && styles.collapsedItem
            ])}
          >
            <Ionicons 
              name="log-out-outline" 
              size={22} 
              color={isSignOutHovered ? theme.colors.headingText : theme.colors.iconColor} 
            />
            {isExpanded && (
              <Text 
                fontType="regular" 
                style={StyleSheet.flatten([
                  styles.label,
                  isSignOutHovered && styles.hoveredLabel
                ])}
              >
                Sign Out
              </Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: theme.colors.cardBackground,
    borderRightWidth: 1,
    borderRightColor: theme.colors.borderColor,
    justifyContent: 'space-between',
    paddingVertical: 16,
    zIndex: 100,
  },
  topSection: {
    flex: 1,
  },
  logoContainer: {
    height: 40,
    marginBottom: 24,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // K icon: centered in the 64px collapsed bar
  logoIcon: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Full logo: left-aligned matching nav item padding
  logoFull: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 20,
    justifyContent: 'center',
  },
  navContainer: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 8,
    height: 48,
  },
  collapsedItem: {
    paddingHorizontal: 0,
    justifyContent: 'center',
    marginHorizontal: 0,
  },
  activeItem: {
    backgroundColor: theme.colors.primaryMuted,
  },
  hoveredItem: {
    backgroundColor: theme.colors.pageBackground,
  },
  label: {
    marginLeft: 12,
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    fontWeight: '500',
    flex: 1,
  },
  activeLabel: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  hoveredLabel: {
    color: theme.colors.headingText,
  },
  bottomSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    marginTop: 16,
  },
});
