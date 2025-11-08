export const theme = {
  colors: {
    // App backgrounds
    background: "#FFFFFF", // white base
    surface: "#F8FAFC", // slightly lighter surface for cards or modals

    // Brand colors
    primary: "#000080", // navy
    primaryDark: "#000080", // navy
    accent: "#E0E0E0", // light gray accent for highlights

    // Status / system colors
    success: "#16A34A", // balanced green
    warning: "#F59E0B", // subtle amber
    danger: "#DC2626", // standard red for errors

    // Text colors
    text: "#000000", // black text for light backgrounds
    textLight: "#828282", // softer gray for hints/placeholders
    gray: "#828282",
    border: "#334155", // muted slate border lines
    lightBorder: "#E0E0E0",
  },

  spacing: (n: number) => n * 8,

  radius: {
    sm: 8,
    md: 12,
    lg: 24,
    pill: 999,
  },

  font: {
    regular: "Poppins_400Regular",
    medium: "Poppins_600SemiBold",
    bold: "Poppins_700Bold",
  },

  shadow: {
    soft: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  },
};
