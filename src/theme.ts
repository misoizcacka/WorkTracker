export const theme = {
  colors: {
    // User-defined colors
    pageBackground: "#F2F3F5",
    cardBackground: "#FFFFFF",
    headingText: "#1A1A1C",
    bodyText: "#3A3A3C",
    iconColor: "#5A5A5C",
    borderColor: "#E0E1E5",

    // Existing brand/status colors (keeping for now, will check usage later)
    primary: "#000080", // navy
    primaryDark: "#000080", // navy
    primaryMuted: "#E6E6FA", // light blue for muted primary
    secondary: "#FFA500", // orange
    accent: "#E0E0E0", // light gray accent for highlights

    success: "#16A34A", // balanced green
    warning: "#F59E0B", // subtle amber
    danger: "#DC2626", // standard red for errors
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
