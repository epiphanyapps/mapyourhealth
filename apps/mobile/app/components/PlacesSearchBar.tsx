import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { theme } from '../../styles/theme';

interface PlacesSearchBarProps {
  onLocationSelected: (address: string, latitude: number, longitude: number) => void;
}

const PlacesSearchBar: React.FC<PlacesSearchBarProps> = ({ onLocationSelected }) => {
  const handlePlaceSelect = (data: any, details?: any | null) => {
    if (details && details.geometry) {
      const { lat, lng } = details.geometry.location;
      onLocationSelected(data.description, lat, lng);
    }
  };

  return (
    <View style={styles.container}>
      <GooglePlacesAutocomplete
        placeholder="Enter address or city"
        fetchDetails={true}
        minLength={2}
        onPress={(data, details) => handlePlaceSelect(data, details)}
        query={{
          key: process.env.GOOGLE_PLACES_API_KEY || '',
          language: 'en',
        }}
        styles={{
          container: styles.searchBarContainer,
          textInput: styles.textInput,
          predefinedPlacesDescription: {
            color: theme.colors.text.secondary,
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.sm,
  },
  searchBarContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
  },
  textInput: {
    height: 40,
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.md,
    paddingHorizontal: theme.spacing.sm,
  },
});

export default PlacesSearchBar;
