"use client";

import { useState, useEffect } from 'react';
import SimpleMap from '@/components/game/simple-map';

export default function MapTestPage() {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to NYC if location access is denied
          setCurrentLocation({
            latitude: 40.7128,
            longitude: -74.0060
          });
        }
      );
    } else {
      // Default to NYC if geolocation is not supported
      setCurrentLocation({
        latitude: 40.7128,
        longitude: -74.0060
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-green-50">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-green-800 mb-4">Map Movement Test</h1>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="h-96">
            <SimpleMap
              currentLocation={currentLocation}
              onLocationUpdate={(location) => {
                console.log('Location updated:', location);
                setCurrentLocation(location);
              }}
            />
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Try to drag the map around</li>
            <li>Use mouse wheel to zoom in/out</li>
            <li>Double-click to zoom in</li>
            <li>Click the location button to return to your position</li>
          </ul>
          {currentLocation && (
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <strong>Current Location:</strong> {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}