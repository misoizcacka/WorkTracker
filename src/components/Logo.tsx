import React from 'react';
import { Image, ImageStyle, StyleProp, Platform, DimensionValue } from 'react-native';
import { theme } from '../theme';

// Import assets
const LogoPNG = require('../../assets/koordlogoblack1.png');
const LogoSVG = require('../../assets/koordlogoblack1.svg');
const KLogoSVG = require('../../assets/klogoblack1.svg');

export type LogoSize = 'small' | 'medium' | 'large' | 'auto';

interface LogoProps {
  size?: LogoSize;
  variant?: 'full' | 'icon';
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'large', 
  variant = 'full',
  style, 
  resizeMode = 'contain' 
}) => {
  let width: DimensionValue = theme.branding.logoWidth;
  let height: DimensionValue = theme.branding.logoHeight;

  if (variant === 'icon') {
    width = 16;
    height = 24;
  } else {
    switch (size) {
      case 'small':
        width = theme.branding.logoWidthSmall;
        height = theme.branding.logoHeightSmall;
        break;
      case 'medium':
        width = theme.branding.logoWidthMedium;
        height = theme.branding.logoHeightMedium;
        break;
      case 'large':
        width = theme.branding.logoWidth;
        height = theme.branding.logoHeight;
        break;
      case 'auto':
        width = '100%';
        height = '100%';
        break;
    }
  }

  const source = variant === 'icon' ? KLogoSVG : (Platform.OS === 'web' ? LogoSVG : LogoPNG);

  return (
    <Image 
      source={source} 
      style={[{ width, height }, style]} 
      resizeMode={resizeMode}
    />
  );
};
