import React, { useState, useEffect } from 'react';
import { Platform, View, Button, StyleSheet, Text, TouchableOpacity } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';
import DatePicker, { registerLocale } from 'react-datepicker';
import { enUS } from 'date-fns/locale';
import { createPortal } from 'react-dom';
import 'react-datepicker/dist/react-datepicker.css';
import { theme } from '../theme'; // Import the theme

interface CrossPlatformDatePickerProps {
  date: Date;
  onDateChange: (newDate: Date) => void;
  mode?: "date" | "month";
}

const Portal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};

const datePickerStyles = `
  .react-datepicker {
    font-family: 'Poppins', sans-serif;
    border-color: ${theme.colors.borderColor};
    border-radius: ${theme.radius.sm}px;
    box-shadow: ${theme.shadow.soft.shadowOffset.width}px ${theme.shadow.soft.shadowOffset.height}px ${theme.shadow.soft.shadowRadius}px ${theme.shadow.soft.shadowColor};
    background-color: ${theme.colors.cardBackground};
    z-index: 9999; /* Ensure it appears above other elements */
  }
  .react-datepicker__header {
    background-color: ${theme.colors.primary};
    border-bottom-color: ${theme.colors.primary};
    border-top-left-radius: ${theme.radius.sm}px; /* Match main picker's border-radius */
    border-top-right-radius: ${theme.radius.sm}px; /* Match main picker's border-radius */
  }
  .react-datepicker__current-month,
  .react-datepicker__day-name {
    color: ${theme.colors.pageBackground};
  }
  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected {
    background-color: ${theme.colors.primary};
    color: ${theme.colors.pageBackground};
    border-radius: ${theme.radius.sm}px; /* Rounded corners for selected days */
  }
  .react-datepicker__day--in-range {
    background-color: ${theme.colors.primaryMuted};
  }
  .react-datepicker__day--in-selecting-range {
    background-color: ${theme.colors.primaryMuted};
  }
  .react-datepicker__day:hover {
    background-color: ${theme.colors.accent};
    border-radius: ${theme.radius.sm}px; /* Rounded corners for hover state */
  }
  .react-datepicker__navigation-icon::before {
    border-color: ${theme.colors.pageBackground};
  }
  .react-datepicker__day-name, .react-datepicker__day, .react-datepicker__time-name {
    color: ${theme.colors.bodyText};
  }
`;

const CrossPlatformDatePicker: React.FC<CrossPlatformDatePickerProps> = ({ date, onDateChange, mode = "date" }) => {
  const [isPickerVisible, setPickerVisible] = useState(false);

  const showPicker = () => {
    setPickerVisible(true);
  };

  const hidePicker = () => {
    setPickerVisible(false);
  };

  const handleConfirm = (selectedDate: Date) => {
    onDateChange(selectedDate);
    hidePicker();
  };

  if (Platform.OS === 'web') {
    registerLocale('en-US', enUS);

    // Custom input for the date picker to make it look like a button
    const CustomInput = React.forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void }>(({ value, onClick }, ref) => (
      <TouchableOpacity style={styles.button} onPress={onClick}>
        <Text style={styles.buttonText}>{value || (mode === "month" ? 'Select Month' : 'Select Date')}</Text>
      </TouchableOpacity>
    ));

    return (
      <>
        <style>{datePickerStyles}</style>
          <DatePicker
            selected={date}
            onChange={(newDate: Date | null) => {
              if (newDate) {
                onDateChange(newDate);
              }
            }}
            customInput={<CustomInput />}
            dateFormat={mode === "month" ? "MM/yyyy" : "MMMM d, yyyy"}
            showMonthYearPicker={mode === "month"}
            locale="en-US"
            popperPlacement="bottom-start" // Adjust placement as needed
            popperContainer={Portal}
          />
      </>
    );
  }

  // Native implementation
  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={showPicker}>
        <Text style={styles.buttonText}>{mode === "month" ? moment(date).format('MMMM YYYY') : moment(date).format('MMMM D, YYYY')}</Text>
      </TouchableOpacity>
      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode="date" // Native picker only supports 'date' mode for month selection
        onConfirm={(selectedDate: Date) => {
          if (mode === "month") {
            onDateChange(moment(selectedDate).startOf('month').toDate());
          } else {
            onDateChange(selectedDate);
          }
          hidePicker();
        }}
        onCancel={hidePicker}
        date={date}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.radius.sm,
  },
  buttonText: {
    color: theme.colors.pageBackground,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CrossPlatformDatePicker;
