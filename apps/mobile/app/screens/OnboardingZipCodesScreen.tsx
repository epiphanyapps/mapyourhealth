import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import PlacesSearchBar from '../../components/PlacesSearchBar';
import useLocationSearch from '../../hooks/useLocationSearch';
import { City } from '../../types/location'; // Ensure you have a type definition for City
import { theme } from '../../styles/theme';

const OnboardingZipCodesScreen: React.FC = () => {
  const [cities] = useState<City[]>([
    { id: '1', name: 'Montreal', latitude: 45.5017, longitude: -73.5673 },
    // Add more cities as needed
  ]);

  const { findNearestCity } = useLocationSearch(cities);
  const [nearestCity, setNearestCity] = useState<City | null>(null);

  const handleLocationSelected = (address: string, latitude: number, longitude: number) => {
    const city = findNearestCity(latitude, longitude);
    if (city) {
      setNearestCity(city);
      Alert.alert(`Using data from ${city.name} (${calculateDistance(latitude, longitude, city.latitude, city.longitude).toFixed(2)}km away)`);
    } else {
      Alert.alert('No nearby cities found');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    // Load cities or other initial data here if needed
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Your Address</Text>
      <PlacesSearchBar onLocationSelected={handleLocationSelected} />
      {nearestCity && (
        <Text style={styles.nearestCityInfo}>
          Using data from {nearestCity.name} ({calculateDistance(0, 0, nearestCity.latitude, nearestCity.longitude).toFixed(2)}km away)
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
    color: theme.colors.text.primary,
  },
  nearestCityInfo: {
    marginTop: theme.spacing.md,
    color: theme.colors.text.secondary,
  },
});

export default OnboardingZipCodesScreen;
