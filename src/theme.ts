export const theme = {
  colors: {
    // User-defined colors
    pageBackground: "#FFFFFF",
    cardBackground: "#F2F3F5",
    headingText: "#1A1A1C",
    bodyText: "#3A3A3C",
    iconColor: "#5A5A5C",
    borderColor: "#E0E1E5",
    disabledText: "#A9A9A9",

    // Existing brand/status colors (keeping for now, will check usage later)
    primary: "#000000", // navy
    primaryDark: "#000000", // navy
    primaryMuted: "#E5E7EB", // light blue for muted primary
    secondary: "#FFA500", // orange
    accent: "#E0E0E0", // light gray accent for highlights

    success: "#16A34A", // balanced green
    warning: "#F59E0B", // subtle amber
    warningMuted: "#FFF3E0", // light orange background
    danger: "#DC2626", // standard red for errors
    background: "#F2F3F5",
  },

  statusColors: {
    successBackground: '#E6F4EA',
    successText: '#16A34A', // Using success color
    warningBackground: '#FDECEC',
    warningText: '#DC2626', // Using danger color for warnings related to order violation
    neutralBackground: '#F0F4F8',
    neutralText: '#3A3A3C',

    // New status colors for assignments
    activeBackground: '#E6E6FA', // Light primary muted for active
    activeText: '#000000', // Dark primary for active
    completedBackground: '#E0E1E5', // Border color for completed background
    completedText: '#5A5A5C', // Icon color for completed text
    nextBackground: '#D1FAE5', // A lighter success shade for 'next'
    nextText: '#065F46', // A darker success shade for 'next'
    pendingBackground: '#FFFBEB', // A lighter warning shade for 'pending'
    pendingText: '#92400E', // A darker warning shade for 'pending'
  },

  spacing: (n: number) => n * 8,

  radius: {
    sm: 8,
    md: 12,
    lg: 24,
    pill: 999,
    xl: 40,
  },

  font: {
    regular: "Poppins_400Regular",
    medium: "Poppins_600SemiBold",
    bold: "Poppins_700Bold",
  },

  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
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
