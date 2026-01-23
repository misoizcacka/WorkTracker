import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { theme } from '../../theme';
import * as Haptics from 'expo-haptics';
import { Card } from '../Card';

const MONTHS = [
  ['Jan', 'Feb', 'Mar'],
  ['Apr', 'May', 'Jun'],
  ['Jul', 'Aug', 'Sep'],
  ['Oct', 'Nov', 'Dec'],
];

interface CustomMonthPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onMonthSelect: (startDate: Date, endDate: Date) => void;
  initialDate?: Date;
}

const CustomMonthPicker: React.FC<CustomMonthPickerProps> = ({
  isVisible,
  onClose,
  onMonthSelect,
  initialDate,
}) => {
  const [selectedYear, setSelectedYear] = useState(moment(initialDate).year());
  const [selectedMonth, setSelectedMonth] = useState(moment(initialDate).month());

  useEffect(() => {
    if (initialDate) {
      setSelectedYear(moment(initialDate).year());
      setSelectedMonth(moment(initialDate).month());
    }
  }, [initialDate]);

  const handleMonthPress = (monthIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const startDate = moment({ year: selectedYear, month: monthIndex }).startOf('month').toDate();
    const endDate = moment({ year: selectedYear, month: monthIndex }).endOf('month').toDate();
    onMonthSelect(startDate, endDate);
    onClose();
  };

  const isFuture = (year: number, month: number) => {
    const currentYear = moment().year();
    const currentMonth = moment().month();
    return year > currentYear || (year === currentYear && month > currentMonth);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.centeredView}>
          <TouchableWithoutFeedback>
            <Card style={styles.modalView}>
              <View style={styles.yearSelector}>
                <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)} style={styles.arrow}>
                  <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.yearText}>{selectedYear}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedYear(selectedYear + 1)}
                  style={styles.arrow}
                  disabled={selectedYear >= moment().year()}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={28}
                    color={selectedYear >= moment().year() ? theme.colors.disabledText : theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.monthGrid}>
                {MONTHS.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.monthRow}>
                    {row.map((month, colIndex) => {
                      const monthIndex = rowIndex * 3 + colIndex;
                      const isSelected = selectedYear === moment(initialDate).year() && monthIndex === selectedMonth;
                      const isCurrentMonth = selectedYear === moment().year() && monthIndex === moment().month();
                      const isDisabled = isFuture(selectedYear, monthIndex);

                      return (
                        <TouchableOpacity
                          key={month}
                          style={[
                            styles.monthButton,
                            isSelected && styles.selectedMonthButton,
                            isCurrentMonth && styles.currentMonthIndicator,
                            isDisabled && styles.disabledMonthButton,
                          ]}
                          onPress={() => handleMonthPress(monthIndex)}
                          disabled={isDisabled}
                        >
                          <Text
                            style={[
                              styles.monthText,
                              isSelected && styles.selectedMonthText,
                              isDisabled && styles.disabledMonthText,
                            ]}
                          >
                            {month}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </Card>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalView: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(5),
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  arrow: {
    padding: theme.spacing(1),
  },
  yearText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  monthGrid: {
    marginTop: theme.spacing(3),
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing(1.5),
  },
  monthButton: {
    width: 80,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.pageBackground,
  },
  selectedMonthButton: {
    backgroundColor: theme.colors.primary,
  },
  currentMonthIndicator: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  disabledMonthButton: {
    backgroundColor: theme.colors.pageBackground,
    opacity: 0.5,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.bodyText,
  },
  selectedMonthText: {
    color: 'white',
  },
  disabledMonthText: {
    color: theme.colors.disabledText,
  },
});

export default CustomMonthPicker;
