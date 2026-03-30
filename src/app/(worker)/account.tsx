import React from "react";
import { StyleSheet, View, ScrollView, Image } from "react-native";
import { Text } from "../../components/Themed";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import AnimatedScreen from "../../components/AnimatedScreen";
import { useSession } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useEmployeeProfile } from "../../hooks/useEmployeeProfile";

export default function WorkerAccountScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { signOut, user, userRole, userCompanyName } = useSession()!;
  const { profile } = useEmployeeProfile();

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member';
  const email = user?.email || "N/A";
  const displayRole = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Worker';

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + theme.spacing(4) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.title} fontType="bold">Account Settings</Text>
            <Text style={styles.subtitle}>Your profile and company information</Text>
          </View>

          <View style={styles.content}>
            {/* 1. Profile Overview Card */}
            <Card style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  {profile?.public_avatar_url ? (
                    <Image source={{ uri: profile.public_avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color="white" />
                  )}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.userName} fontType="bold">{fullName}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText} fontType="bold">{displayRole.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email Address</Text>
                  <Text style={styles.detailValue} fontType="medium">{email}</Text>
                </View>
              </View>

              {userCompanyName && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Company</Text>
                    <Text style={styles.detailValue} fontType="medium">{userCompanyName}</Text>
                  </View>
                </View>
              )}
            </Card>

            {/* 2. Logout Action */}
            <View style={styles.logoutContainer}>
              <Button
                title="Log Out"
                onPress={() => signOut()}
                style={styles.logoutButton}
                textStyle={styles.logoutButtonText}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollContent: {
    paddingTop: theme.spacing(3),
  },
  pageHeader: {
    paddingHorizontal: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  title: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
  },
  subtitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: theme.spacing(3),
  },
  profileCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(2),
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    color: theme.colors.headingText,
  },
  roleBadge: {
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing(1),
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginVertical: theme.spacing(2),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(1.5),
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.disabledText,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.headingText,
  },
  logoutContainer: {
    alignItems: 'center',
    marginTop: theme.spacing(2),
  },
  logoutButton: {
    width: '100%',
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.danger,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
