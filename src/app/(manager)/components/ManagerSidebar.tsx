import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Image, Platform } from 'react-native';
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
          color={isActive ? "#2563EB" : (isHovered ? "#1F2937" : theme.colors.iconColor)} 
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
  const pathname = usePathname();
  const { signOut } = useSession();

  const toggleSidebar = (expand: boolean) => {
    setIsExpanded(expand);
    Animated.spring(animation, {
      toValue: expand ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  const navItems = [
    { icon: 'home-outline', label: 'Dashboard', href: '/(manager)/dashboard' },
    { icon: 'map-outline', label: 'Map Overview', href: '/(manager)/map-overview' },
    { icon: 'timer-outline', label: 'Location Replay', href: '/(manager)/location-replay' },
    { icon: 'people-outline', label: 'Employees', href: '/(manager)/employees' },
    { icon: 'folder-outline', label: 'Projects', href: '/(manager)/projects' },
    { icon: 'pin-outline', label: 'Common Locations', href: '/(manager)/common-locations' },
    { icon: 'calendar-outline', label: 'Worker Assignments', href: '/(manager)/worker-assignments' },
    { icon: 'construct-outline', label: 'Session Corrections', href: '/(manager)/corrections' },
    { icon: 'document-text-outline', label: 'Reports', href: '/(manager)/reports' },
    { icon: 'person-circle-outline', label: 'Account', href: '/(manager)/account' },
  ];

  const kLogoOpacity = animation.interpolate({
    inputRange: [SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_COLLAPSED_WIDTH + 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const fullLogoOpacity = animation.interpolate({
    inputRange: [SIDEBAR_COLLAPSED_WIDTH + 60, SIDEBAR_EXPANDED_WIDTH - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleMouseEnter = () => {
    if (Platform.OS === 'web') {
      toggleSidebar(true);
    }
  };

  const handleMouseLeave = () => {
    if (Platform.OS === 'web') {
      toggleSidebar(false);
    }
  };

  const AnimatedLogo = Animated.createAnimatedComponent(Logo);

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
            <Pressable style={StyleSheet.flatten([styles.logoContainer, !isExpanded && styles.collapsedLogo])}>
                <View style={{ height: 24, width: '100%', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <AnimatedLogo
                      variant="icon"
                      style={{ 
                        opacity: kLogoOpacity,
                        position: 'absolute'
                      }}
                  />
                  <AnimatedLogo
                      size="small"
                      style={{ 
                        opacity: fullLogoOpacity,
                      }}
                  />
                </View>
            </Pressable>
          </Link>

          <View style={styles.navContainer}>
            {navItems.map((item) => (
              <SidebarItem 
                key={item.href}
                icon={item.icon as any}
                label={item.label}
                href={item.href}
                isActive={pathname.startsWith(item.href)}
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
              color={isSignOutHovered ? "#1F2937" : theme.colors.iconColor} 
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
    paddingLeft: 24,
    marginBottom: 32,
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  collapsedLogo: {
    paddingLeft: 24,
    justifyContent: 'flex-start',
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
    backgroundColor: "#F3F4F6",
  },
  label: {
    marginLeft: 12,
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    fontWeight: '500',
    flex: 1,
  },
  activeLabel: {
    color: "#2563EB",
    fontWeight: '600',
  },
  hoveredLabel: {
    color: "#1F2937",
  },
  bottomSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    marginTop: 16,
  },
});
