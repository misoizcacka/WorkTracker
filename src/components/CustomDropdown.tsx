// frontend/src/components/CustomDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, ScrollView, TextInput, Platform } from 'react-native';
import { Text } from '../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface DropdownOption {
  label: string;
  value: string;
  [key: string]: any; // Allow string indexing for labelField and valueField
}

interface CustomDropdownProps {
  data: DropdownOption[];
  value: string | null;
  onChange: (item: DropdownOption) => void;
  placeholder?: string;
  searchable?: boolean;
  labelField?: string;
  valueField?: string;
  style?: any; // To allow custom styling for the container
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  data,
  value,
  onChange,
  placeholder,
  searchable = false,
  labelField = 'label',
  valueField = 'value',
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const selectedOption = data.find(item => item[valueField] === value);

  useEffect(() => {
    if (isVisible) {
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setSearchTerm('')); // Clear search term when closing
    }
  }, [isVisible, dropdownAnim]);

  const toggleDropdown = () => {
    setIsVisible(prev => !prev);
  };

  const handleSelect = (item: DropdownOption) => {
    onChange(item);
    setIsVisible(false);
  };

  const filteredData = searchTerm
    ? data.filter(item =>
        item[labelField].toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data;

  const dropdownStyle = {
    opacity: dropdownAnim,
    transform: [
      {
        scaleY: dropdownAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
      },
    ],
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity onPress={toggleDropdown} style={styles.button}>
        <Text style={selectedOption ? styles.selectedText : styles.placeholderText} fontType={selectedOption ? "medium" : "regular"}>
          {selectedOption ? selectedOption[labelField] : placeholder}
        </Text>
        <Ionicons
          name={isVisible ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={20}
          color={theme.colors.bodyText}
        />
      </TouchableOpacity>

      {isVisible && (
        <Animated.View style={[styles.dropdown, dropdownStyle]}>
          {searchable && (
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={theme.colors.bodyText}
              onFocus={() => {}} // Override default onFocus to prevent immediate close
              onBlur={() => {}} // Override default onBlur
            />
          )}
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <TouchableOpacity
                  key={item[valueField]}
                  style={styles.item}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.itemText} fontType="regular">{item[labelField]}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noResultsText} fontType="regular">No results found</Text>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    // Removed marginBottom as it should be controlled by the parent
    zIndex: 10, // Ensure dropdown appears above other content
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40, // Adjusted height
    borderColor: theme.colors.borderColor,
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.pageBackground, // Lighter background
  },
  selectedText: {
    flex: 1, // Allow text to expand
    fontSize: theme.fontSizes.md, // Adjusted
    color: theme.colors.headingText,
    // Removed fontWeight: '500', fontType handles it
  },
  placeholderText: {
    flex: 1, // Allow text to expand
    fontSize: theme.fontSizes.md, // Adjusted
    color: theme.colors.bodyText, // Adjusted
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    width: '100%',
    maxHeight: 200,
    backgroundColor: theme.colors.cardBackground, // Adjusted
    borderRadius: theme.radius.md, // Adjusted
    ...theme.shadow.soft,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 100, // Ensure dropdown items are above other elements
  },
  searchInput: {
    height: 40, // Adjusted
    borderColor: theme.colors.borderColor,
    borderBottomWidth: 1,
    paddingHorizontal: theme.spacing(2),
    fontSize: theme.fontSizes.md, // Adjusted
    color: theme.colors.headingText,
    backgroundColor: theme.colors.pageBackground,
  },
  item: {
    padding: theme.spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderColor,
  },
  itemText: {
    fontSize: theme.fontSizes.md, // Adjusted
    color: theme.colors.headingText,
  },
  noResultsText: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.colors.bodyText,
    fontSize: theme.fontSizes.md, // Adjusted
  },
});

export default CustomDropdown;