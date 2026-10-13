import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Modal, View, TextInput, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Dimensions, Image, Easing, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { ProjectsContext, ProjectsContextType, Project } from '../context/ProjectsContext';
import { Button } from './Button';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import ThemedInput from './ThemedInput';
import CustomDropdown from './CustomDropdown';
import { debounce, fetchGeoapifySuggestions, GeoapifyFeature } from '~/utils/geocoding';
import * as ImagePicker from 'expo-image-picker';
import { MediaType } from 'expo-image-picker';
import { MapPreview } from './MapPreview';
import { Text } from './Themed';

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  project?: Project | null;
}

interface DropdownOption {
  label: string;
  value: string;
}

const PREDEFINED_COLORS = ['#FF6347', '#4682B4', '#32CD32', '#DAA520', '#6A5ACD', '#FF69B4', '#FFD700', '#ADFF2F', '#87CEEB', '#FF69B4'];
const PROJECT_STATUS_OPTIONS: DropdownOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
];

const MAX_MODAL_WIDTH = 500;
const MOBILE_MAX_WIDTH = 420;

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ visible, onClose, mode = 'create', project = null }) => {
  const { width } = Dimensions.get('window');
  const isMobile = width < MOBILE_MAX_WIDTH;

  const { createProject, updateProject, isLoading, error: contextError } = useContext(ProjectsContext) as ProjectsContextType;

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [explanation, setExplanation] = useState('');
  const [status, setStatus] = useState<'active' | 'closed'>('active');
  const [formError, setFormError] = useState('');
  const [locationMode, setLocationMode] = useState<'address' | 'coordinates'>('address');
  const [coordLat, setCoordLat] = useState('');
  const [coordLng, setCoordLng] = useState('');
  const [checkInRadius, setCheckInRadius] = useState(150);

  const [suggestions, setSuggestions] = useState<GeoapifyFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddressLocation, setSelectedAddressLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const addressInputRef = useRef<TextInput>(null);
  const modalAnimatedValue = useRef(new Animated.Value(0)).current;

  const isEditMode = mode === 'edit' && !!project;

  useEffect(() => {
    if (visible && isEditMode && project) {
      setName(project.name);
      setAddress(project.address);
      setAddressSearchTerm(project.address);
      setExplanation(project.explanation || '');
      setStatus(project.status || 'active');
      setSelectedAddressLocation(project.location);
      setSelectedImages(project.photos.map((uri) => ({ uri } as ImagePicker.ImagePickerAsset)));
      setFormError('');
      setCoordLat(project.location?.latitude?.toString() ?? '');
      setCoordLng(project.location?.longitude?.toString() ?? '');
      setLocationMode('address');
      setCheckInRadius(project.check_in_radius ?? 150);
      return;
    }

    if (!visible) {
      setTimeout(() => {
        setName('');
        setAddress('');
        setAddressSearchTerm('');
        setExplanation('');
        setStatus('active');
        setSelectedAddressLocation(null);
        setSelectedImages([]);
        setFormError('');
        setLocationMode('address');
        setCoordLat('');
        setCoordLng('');
        setCheckInRadius(150);
      }, 300);
    }
  }, [visible, isEditMode, project]);

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

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError('Project name is required.');
      return;
    }

    let resolvedLocation = selectedAddressLocation;
    let resolvedAddress = address.trim();

    if (locationMode === 'coordinates') {
      const lat = parseFloat(coordLat);
      const lng = parseFloat(coordLng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setFormError('Enter valid coordinates. Latitude: –90 to 90, Longitude: –180 to 180.');
        return;
      }
      resolvedLocation = { latitude: lat, longitude: lng };
      // Use coordinates as address label if no address text entered
      if (!resolvedAddress) {
        resolvedAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    } else {
      if (!resolvedAddress || !resolvedLocation) {
        setFormError('Search and select a valid address from the suggestions.');
        return;
      }
    }

    setFormError('');
    const projectColor = project?.color || PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
    const savedProject = await (isEditMode && project ? updateProject(project.id, {
      name: name.trim(),
      address: resolvedAddress,
      explanation: explanation.trim(),
      status,
      color: projectColor,
      location: resolvedLocation!,
      photos: selectedImages.map(img => img.uri),
      check_in_radius: checkInRadius,
    }) : createProject({
      name: name.trim(),
      address: resolvedAddress,
      explanation: explanation.trim(),
      status,
      color: projectColor,
      location: resolvedLocation!,
      photos: selectedImages.map(img => img.uri),
      check_in_radius: checkInRadius,
    }));
    if (savedProject) {
      onClose();
    }
  };

  const coordsValid = locationMode === 'coordinates' &&
    !isNaN(parseFloat(coordLat)) && !isNaN(parseFloat(coordLng));
  const isCreateButtonDisabled = isLoading || !name.trim() ||
    (locationMode === 'address' ? (!address.trim() || !selectedAddressLocation) : !coordsValid);
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
          <Text style={styles.modalTitle}>{isEditMode ? 'Edit Project' : 'Create New Project'}</Text>
          
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
            
            {/* Location mode toggle */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modeToggleButton, locationMode === 'address' && styles.modeToggleButtonActive]}
                onPress={() => setLocationMode('address')}
              >
                <Ionicons name="search-outline" size={14} color={locationMode === 'address' ? 'white' : theme.colors.bodyText} />
                <Text style={[styles.modeToggleText, locationMode === 'address' && styles.modeToggleTextActive]} fontType="medium">
                  Address
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleButton, locationMode === 'coordinates' && styles.modeToggleButtonActive]}
                onPress={() => setLocationMode('coordinates')}
              >
                <Ionicons name="locate-outline" size={14} color={locationMode === 'coordinates' ? 'white' : theme.colors.bodyText} />
                <Text style={[styles.modeToggleText, locationMode === 'coordinates' && styles.modeToggleTextActive]} fontType="medium">
                  Coordinates
                </Text>
              </TouchableOpacity>
            </View>

            {locationMode === 'address' ? (
              <View style={[styles.addressInputContainer, { zIndex: 20 }]}>
                <Ionicons name="search" size={20} color={theme.colors.bodyText} style={styles.addressInputIcon} />
                <ThemedInput
                  ref={addressInputRef}
                  style={styles.addressInput}
                  placeholder="Search address *"
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
            ) : (
              <View style={styles.coordsRow}>
                <View style={styles.coordField}>
                  <Text style={styles.coordLabel} fontType="medium">Latitude</Text>
                  <ThemedInput
                    style={styles.coordInput}
                    placeholder="e.g. 48.8566"
                    value={coordLat}
                    onChangeText={setCoordLat}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.coordField}>
                  <Text style={styles.coordLabel} fontType="medium">Longitude</Text>
                  <ThemedInput
                    style={styles.coordInput}
                    placeholder="e.g. 2.3522"
                    value={coordLng}
                    onChangeText={setCoordLng}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            )}
            
            {(() => {
              const previewLocation = locationMode === 'address'
                ? selectedAddressLocation
                : (!isNaN(parseFloat(coordLat)) && !isNaN(parseFloat(coordLng)))
                  ? { latitude: parseFloat(coordLat), longitude: parseFloat(coordLng) }
                  : null;
              return previewLocation ? (
                <View style={styles.mapPreviewContainer}>
                  <Text style={styles.mapPreviewTitle}>Selected Location</Text>
                  <MapPreview
                    latitude={previewLocation.latitude}
                    longitude={previewLocation.longitude}
                    radius={checkInRadius}
                    height={150}
                  />
                </View>
              ) : null;
            })()}

            {/* Check-in radius slider — only relevant when a location is set */}
            <View style={styles.radiusSection}>
              <View style={styles.radiusTitleRow}>
                <Text style={styles.inputLabel}>Check-in Radius</Text>
                <View style={styles.radiusBadge}>
                  <Text style={styles.radiusBadgeText} fontType="bold">{checkInRadius} m</Text>
                </View>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={50}
                maximumValue={1000}
                step={25}
                value={checkInRadius}
                onValueChange={(v) => setCheckInRadius(Math.round(v))}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.borderColor}
                thumbTintColor={theme.colors.primary}
              />
              <View style={styles.radiusHints}>
                <Text style={styles.radiusHintText} fontType="regular">50 m</Text>
                <Text style={styles.radiusHintText} fontType="regular">1000 m</Text>
              </View>
              <Text style={styles.radiusSubtitle} fontType="regular">
                Workers must be within this distance to check in. The circle is shown on the map preview above.
              </Text>
            </View>

            <ThemedInput
              style={[styles.inputField, styles.multilineInput]}
              placeholder="Explanation"
              value={explanation}
              onChangeText={setExplanation}
              multiline
            />

            <View style={styles.statusField}>
              <Text style={styles.inputLabel}>Status</Text>
              <CustomDropdown
                data={PROJECT_STATUS_OPTIONS}
                value={status}
                onChange={(item: DropdownOption) => setStatus(item.value as 'active' | 'closed')}
                placeholder="Select status"
              />
            </View>
            
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
            
            <View style={styles.buttonContainer}>
              <Button
                onPress={handleSubmit}
                disabled={isCreateButtonDisabled}
                loading={isLoading}
                title={isEditMode ? 'Save Changes' : 'Create Project'}
                style={styles.createButton}
                textStyle={styles.createButtonText}
              />
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
    marginBottom: theme.spacing(1),
    fontSize: 15,
    color: theme.colors.bodyText,
    fontWeight: '500',
  },
  statusField: {
    width: '100%',
    marginBottom: theme.spacing(2),
    zIndex: 10,
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
  // Location mode toggle
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: 3,
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.sm,
  },
  modeToggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeToggleText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  modeToggleTextActive: {
    color: 'white',
  },
  // Coordinates inputs
  coordsRow: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  coordField: {
    flex: 1,
  },
  coordLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(0.75),
  },
  coordInput: {
    marginBottom: 0,
  },
  // Radius slider
  radiusSection: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  radiusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(0.5),
  },
  radiusBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  radiusBadgeText: {
    color: 'white',
    fontSize: theme.fontSizes.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -theme.spacing(0.5),
  },
  radiusHintText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
  },
  radiusSubtitle: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    marginTop: theme.spacing(0.5),
    lineHeight: 16,
  },
});
