import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { getAvatarPublicUrl } from '../services/profile';

interface UserAvatarProps {
  avatarUrl?: string | null;
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  iconColor?: string;
  placeholderBackgroundColor?: string;
}

/**
 * A unified Avatar component that handles resolving Supabase storage paths
 * to public renderable URLs automatically.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  size = 40,
  style,
  imageStyle,
  iconColor = theme.colors.bodyText,
  placeholderBackgroundColor = theme.colors.pageBackground,
}) => {
  const publicUrl = avatarUrl ? getAvatarPublicUrl(avatarUrl) : null;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: placeholderBackgroundColor,
    ...style,
  };

  if (publicUrl) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: publicUrl }}
          style={[
            {
              width: '100%',
              height: '100%',
            },
            imageStyle,
          ]}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Ionicons 
        name="person" 
        size={size * 0.6} 
        color={iconColor} 
      />
    </View>
  );
};

export default UserAvatar;
