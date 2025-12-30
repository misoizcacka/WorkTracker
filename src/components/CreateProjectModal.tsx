import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Animated, Platform, Dimensions, Image, Easing } from 'react-native';
import { ProjectsContext, ProjectsContextType } from '../context/ProjectsContext';
import { Button } from './Button';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import ThemedInput from './ThemedInput';
import CustomDropdown from './CustomDropdown';
import { debounce, fetchGeoapifySuggestions, GeoapifyFeature } from '~/utils/geocoding';
import * as ImagePicker from 'expo-image-picker';
import { MediaType } from 'expo-image-picker';
import { MapView } from './MapView'; // Import MapView
import { EmbedMapView } from './EmbedMapView.web'; // Import EmbedMapView

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DropdownOption {
  label: string;
  value: string;
}

const PREDEFINED_COLORS = ['#FF6347', '#4682B4', '#32CD32', '#DAA520', '#6A5ACD', '#FF69B4', '#FFD700', '#ADFF2F', '#87CEEB', '#FF69B4'];

const MAX_MODAL_WIDTH = 500;
const MOBILE_MAX_WIDTH = 420;

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ visible, onClose }) => {
  const { width } = Dimensions.get('window');
  const isMobile = width < MOBILE_MAX_WIDTH;

  const { createProject, isLoading, error: contextError } = useContext(ProjectsContext) as ProjectsContextType;

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [explanation, setExplanation] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const [suggestions, setSuggestions] = useState<GeoapifyFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddressLocation, setSelectedAddressLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const addressInputRef = useRef<TextInput>(null);
  const modalAnimatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setName('');
        setAddress('');
        setAddressSearchTerm('');
        setExplanation('');
        setNotes('');
        setSelectedAddressLocation(null);
        setSelectedImages([]);
        setFormError('');
      }, 300);
    }
  }, [visible]);

  useEffect(() => {
    Animated.timing(modalAnimatedValue, {
      toValue: visible ? 1 : 0,
      duration: visible ? 300 : 200,
      easing: visible ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [visible, modalAnimatedValue]);

  const modalTranslateY = modalAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const modalOpacity = modalAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 3) {
        setSuggestions([]);
        setSuggestionsLoading(false);
        return;
      }
      setSuggestionsLoading(true);
      const result = await fetchGeoapifySuggestions(term);
      if ('error' in result) {
        setSuggestions([]);
        setFormError(result.error);
      } else {
        setSuggestions(result.features);
        setFormError('');
      }
      setSuggestionsLoading(false);
    }, 400),
    []
  );

  useEffect(() => {
    if (addressSearchTerm) {
      debouncedSearch(addressSearchTerm);
      setShowSuggestions(addressSearchTerm !== address);
    } else {
      setSuggestions([]);
      setSelectedAddressLocation(null);
      setAddress('');
    }
  }, [addressSearchTerm, debouncedSearch, address]);

  const handleSelectSuggestion = (feature: GeoapifyFeature) => {
    const { formatted, lat, lon } = feature.properties;
    setAddress(formatted);
    setSelectedAddressLocation({ latitude: lat, longitude: lon });
    setAddressSearchTerm(formatted);
    setShowSuggestions(false);
    setSuggestions([]);
    addressInputRef.current?.blur();
  };

  const handlePickImage = async () => {
    const remainingSlots = 10 - selectedImages.length;
    if (remainingSlots <= 0) {
      setFormError('You can only select a maximum of 10 photos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: remainingSlots,
    });
    if (!result.canceled) {
      setSelectedImages(prev => [...prev, ...result.assets]);
    }
  };

  const handleRemoveImage = (uri: string) => {
    setSelectedImages(prev => prev.filter(image => image.uri !== uri));
  };

  const handleCreate = async () => {
    if (!name.trim() || !address.trim() || !selectedAddressLocation) {
      setFormError('Project name, address, and a valid location are required.');
      return;
    }
    setFormError('');
    const randomColor = PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
    const createdProject = await createProject({
      name: name.trim(),
      address: address.trim(),
      explanation: explanation.trim(),
      color: randomColor,
      notes: notes.trim(),
      location: selectedAddressLocation,
      photos: selectedImages.map(img => img.uri),
    });
    if (createdProject) {
      onClose();
    }
  };

  const isCreateButtonDisabled = isLoading || !name.trim() || !address.trim() || !selectedAddressLocation;
  const displayError = formError || contextError;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.centeredView, { opacity: modalAnimatedValue }]}>
        <Animated.View style={[
          styles.modalView,
          isMobile ? styles.modalViewMobile : styles.modalViewDesktop,
          { transform: [{ translateY: modalTranslateY }], opacity: modalOpacity }
        ]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle-outline" size={24} color={theme.colors.bodyText} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create New Project</Text>
          
          <ScrollView 
            style={styles.scrollContainer} 
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {displayError && <Text style={styles.errorText}>{displayError}</Text>}

            <ThemedInput
              style={styles.inputField}
              placeholder="Project Name *"
              value={name}
              onChangeText={setName}
            />
            
            <View style={[styles.addressInputContainer, { zIndex: 20 }]}>
              <Ionicons name="search" size={20} color={theme.colors.bodyText} style={styles.addressInputIcon} />
              <ThemedInput
                ref={addressInputRef}
                style={styles.addressInput}
                placeholder="Address *"
                value={addressSearchTerm}
                onChangeText={(text) => {
                  setAddressSearchTerm(text);
                  if (text !== address) setSelectedAddressLocation(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {selectedAddressLocation && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} style={styles.addressCheckmarkIcon} />
              )}
              {showSuggestions && suggestions.length > 0 && (
                <Animated.View style={[styles.suggestionsDropdown, { opacity: modalOpacity }]}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {suggestions.map((feature, index) => (
                      <TouchableOpacity
                        key={feature.properties.formatted + index}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectSuggestion(feature)}
                      >
                        <Text style={styles.suggestionText}>{feature.properties.formatted}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {suggestionsLoading && (
                    <View style={styles.suggestionsLoadingOverlay}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
            
            {selectedAddressLocation && (
              <View style={styles.mapPreviewContainer}>
                <Text style={styles.mapPreviewTitle}>Selected Location</Text>
                <View style={styles.mapWrapper}>
                  {Platform.OS === 'web' ? (
                    <EmbedMapView latitude={selectedAddressLocation.latitude} longitude={selectedAddressLocation.longitude} name={address} />
                  ) : (
                    <MapView initialRegion={{ ...selectedAddressLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 }} scrollEnabled={false} pitchEnabled={false} rotateEnabled={false} />
                  )}
                </View>
              </View>
            )}

            <ThemedInput
              style={[styles.inputField, styles.multilineInput]}
              placeholder="Explanation"
              value={explanation}
              onChangeText={setExplanation}
              multiline
            />
            
            <Text style={styles.inputLabel}>Upload Photos (up to 10)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
              <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.uploadButtonText}>Choose Images</Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && (
              <ScrollView horizontal style={styles.imagePreviewContainer}>
                {selectedImages.map((image) => (
                  <View key={image.uri} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                    <TouchableOpacity onPress={() => handleRemoveImage(image.uri)} style={styles.removeImageButton}>
                      <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <ThemedInput
              style={[styles.inputField, styles.multilineInput]}
              placeholder="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            
            <View style={styles.buttonContainer}>
              <Button onPress={handleCreate} disabled={isCreateButtonDisabled} style={styles.createButton}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Create Project</Text>}
              </Button>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    alignItems: 'center',
    ...theme.shadow.soft,
    maxHeight: '90%', // <-- REQUIREMENT MET
  },
  modalViewMobile: {
    width: '90%',
  },
  modalViewDesktop: {
    width: MAX_MODAL_WIDTH,
  },
  scrollContainer: { // <-- NEW STYLE for ScrollView
    width: '100%',
  },
  scrollContentContainer: { // <-- NEW STYLE for ScrollView content
    paddingBottom: theme.spacing(2),
  },
  modalTitle: {
    marginBottom: theme.spacing(3),
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '500',
    color: theme.colors.headingText,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing(2),
    right: theme.spacing(2),
    zIndex: 1,
  },
  inputField: {
    marginBottom: theme.spacing(2),
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: theme.spacing(1.5),
  },
  inputLabel: {
    alignSelf: 'flex-start',
    marginLeft: theme.spacing(1),
    marginBottom: theme.spacing(1),
    fontSize: 15,
    color: theme.colors.bodyText,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: theme.spacing(2),
  },
  createButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: theme.spacing(2),
    textAlign: 'center',
    fontSize: 14,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: theme.spacing(2),
    zIndex: 20,
  },
  addressInput: {
    flex: 1,
    marginBottom: 0,
    paddingLeft: theme.spacing(5),
    paddingRight: theme.spacing(5),
  },
  addressInputIcon: {
    position: 'absolute',
    left: theme.spacing(2),
    zIndex: 1,
  },
  addressCheckmarkIcon: {
    position: 'absolute',
    right: theme.spacing(2),
    zIndex: 1,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    marginTop: theme.spacing(1),
    width: '100%',
    maxHeight: 200,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    ...theme.shadow.soft,
    zIndex: 1000,
    overflow: 'hidden',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    paddingVertical: theme.spacing(1),
  },
  suggestionItem: {
    padding: theme.spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderColor,
  },
  suggestionText: {
    fontSize: 16,
    color: theme.colors.headingText,
  },
  suggestionsLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1001,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    width: '100%',
    justifyContent: 'center',
  },
  uploadButtonText: {
    marginLeft: theme.spacing(1),
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: theme.spacing(1),
    width: 80,
    height: 80,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 2,
  },
  mapPreviewContainer: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  mapPreviewTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
    alignSelf: 'flex-start',
    marginLeft: theme.spacing(1),
  },
  mapWrapper: {
    height: 150,
    width: '100%',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
});