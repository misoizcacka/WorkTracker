import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '~/theme';

interface SearchableDropdownProps<T> {
  data: T[];
  placeholder: string;
  onSelect: (item: T) => void;
  labelExtractor: (item: T) => string;
  keyExtractor: (item: T) => string;
  selectedValue?: T | null;
}

export function SearchableDropdown<T>({
  data,
  placeholder,
  onSelect,
  labelExtractor,
  keyExtractor,
  selectedValue,
}: SearchableDropdownProps<T>) {
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const filteredData = data.filter(item =>
    labelExtractor(item).toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectItem = (item: T) => {
    onSelect(item);
    setSearchText(labelExtractor(item));
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.inputContainer} onPress={() => setModalVisible(true)}>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.bodyText}
          value={selectedValue ? labelExtractor(selectedValue) : searchText}
          onChangeText={setSearchText}
          editable={false} // Make it non-editable to force selection via modal
        />
        <Ionicons name="chevron-down" size={20} color={theme.colors.iconColor} />
      </TouchableOpacity>

      <Modal
        transparent={true}
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchTextInput}
              placeholder={`Search ${placeholder.toLowerCase()}`}
              placeholderTextColor={theme.colors.bodyText}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            <FlatList
              data={filteredData}
              keyExtractor={keyExtractor}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleSelectItem(item)}
                >
                  <Text style={styles.itemText}>{labelExtractor(item)}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No results found</Text>}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing(1),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(1.5),
    height: 40,
    backgroundColor: theme.colors.accent,
  },
  textInput: {
    flex: 1,
    color: theme.colors.headingText,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    width: '80%',
    maxHeight: '70%',
  },
  searchTextInput: {
    height: 40,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    color: theme.colors.headingText,
    backgroundColor: theme.colors.accent,
  },
  item: {
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  itemText: {
    fontSize: 16,
    color: theme.colors.headingText,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: theme.spacing(2),
    color: theme.colors.bodyText,
  },
  closeButton: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    color: theme.colors.cardBackground,
    fontWeight: 'bold',
  },
});
