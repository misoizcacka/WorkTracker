import { Text as DefaultText, View as DefaultView } from 'react-native';
import { theme } from '../theme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'] & {
  fontType?: keyof typeof theme.font;
};
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof theme.colors
) {
  const colorFromProps = props.light;
  if (colorFromProps) {
    return colorFromProps;
  } else {
    return theme.colors[colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, fontType = 'regular', ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'bodyText');
  const fontFamily = theme.font[fontType];

  return <DefaultText style={[{ color, fontFamily }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'pageBackground');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
