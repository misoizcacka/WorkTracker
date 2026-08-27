import React from 'react';
import { Image, ImageStyle, StyleProp, Platform, DimensionValue } from 'react-native';
import { theme } from '../theme';

// Import assets
const LogoPNG = require('../../assets/koordlogoblack1.png');
const LogoSVG = require('../../assets/koordinatelogo.svg');
const KLogoSVG = require('../../assets/klogoblack1.svg');

export type LogoSize = 'small' | 'medium' | 'large' | 'auto';

interface LogoProps {
  size?: LogoSize;
  variant?: 'full' | 'icon';
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  variant = 'full',
  style, 
  resizeMode = 'contain' 
}) => {
  let width: DimensionValue = theme.branding.logoWidth;
  let height: DimensionValue = theme.branding.logoHeight;

  if (variant === 'icon') {
    width = 24;
    height = 36;
  } else {
    switch (size) {
      case 'small':
        width = 89;
        height = 18;
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

  if (Platform.OS === 'web') {
    const src = variant === 'icon' ? KLogoSVG : LogoSVG;
    const resolvedSrc = typeof src === 'string' ? src : (src.default ?? src.uri ?? src);
    // Allow style prop to override width/height on web
    const styleObj = style as any;
    const resolvedWidth = styleObj?.width ?? width;
    const resolvedHeight = styleObj?.height ?? height;
    return (
      // @ts-ignore
      <img
        src={resolvedSrc}
        width={resolvedWidth as number}
        height={resolvedHeight as number}
        style={{ display: 'block', objectFit: 'contain' }}
        draggable={false}
      />
    );
  }

  const source = variant === 'icon' ? KLogoSVG : LogoPNG;

  return (
    <Image 
      source={source} 
      style={[{ width, height }, style]} 
      resizeMode={resizeMode}
    />
  );
};
