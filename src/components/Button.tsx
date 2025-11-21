import * as React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
  TextStyle,
} from "react-native";
import { theme } from "../theme";

interface ButtonProps {
  title?: string;
  onPress?: (event: GestureResponderEvent) => void;
  type?: "primary" | "danger" | "secondary";
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  type = "primary",
  disabled = false,
  style,
  textStyle,
  children,
}) => {
  const backgroundColor =
    type === "primary"
      ? theme.colors.primary
      : type === "danger"
      ? theme.colors.danger
      : theme.colors.accent;

  const buttonStyle = [
    styles.button,
    { backgroundColor: disabled ? theme.colors.bodyText : backgroundColor },
    type === "secondary" && styles.secondaryButton,
    style,
  ];

  const textColor =
    type === "secondary"
      ? theme.colors.pageBackground
      : theme.colors.pageBackground;

  return (
    <TouchableOpacity
      onPress={!disabled ? onPress : undefined}
      style={buttonStyle}
      activeOpacity={disabled ? 1 : 0.7}
    >
      {children ? (
        children
      ) : (
        <Text
          style={[
            styles.text,
            { color: disabled ? theme.colors.bodyText : textColor },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(4),
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    shadowColor: theme.shadow.soft.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Semi-transparent white background
    borderWidth: 1.5,
    borderColor: theme.colors.borderColor, // Light gray border
    borderRadius: theme.radius.md,
  },
  text: {
    fontWeight: "700",
    fontSize: 18,
  },
});
