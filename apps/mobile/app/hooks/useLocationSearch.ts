import React, { useCallback } from 'react';
import * as Location from 'expo-location';
import { City } from '../../types/location'; // Ensure you have a type definition for City

const useLocationSearch = (cities: City[]) => {
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
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
  }, []);

  const findNearestCity = useCallback(
    (latitude: number, longitude: number): City | null => {
      let nearestCity: City | null = null;
      let minDistance = Infinity;

      cities.forEach((city) => {
        if (city.latitude && city.longitude) {
          const distance = calculateDistance(latitude, longitude, city.latitude, city.longitude);
          if (distance < minDistance) {
            minDistance = distance;
            nearestCity = city;
          }
        }
      });

      return nearestCity;
    },
    [cities, calculateDistance]
  );

  return { findNearestCity };
};

export default useLocationSearch;
