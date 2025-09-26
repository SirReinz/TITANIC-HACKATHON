"use client";

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SimpleMapProps {
  currentLocation: { latitude: number; longitude: number } | null;
  onPlayerSelect?: (player: any) => void;
  onLocationUpdate?: (location: { latitude: number; longitude: number }) => void;
  onStartChat?: (player: any) => void;
}

export default function SimpleMap({ currentLocation, onPlayerSelect, onLocationUpdate, onStartChat }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      if (typeof window === 'undefined' || !mapRef.current) return;

      try {
        // Import Leaflet dynamically
        const L = (await import('leaflet')).default;
        
        // CSS is imported globally

        // Fix default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const initialCenter: [number, number] = currentLocation 
          ? [currentLocation.latitude, currentLocation.longitude]
          : [40.7128, -74.0060]; // Default to NYC

        // Create map
        const map = L.map(mapRef.current, {
          center: initialCenter,
          zoom: 16,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          scrollWheelZoom: true,
          boxZoom: true,
          keyboard: true,
          zoomControl: true,
        });

        // Add tile layer with grayscale filter
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          className: 'grayscale-map'
        }).addTo(map);

        // Add current user marker if location exists
        if (currentLocation) {
          const userMarker = L.marker([currentLocation.latitude, currentLocation.longitude])
            .addTo(map)
            .bindPopup('Your Location');

          // Add 100m messaging circle
          L.circle([currentLocation.latitude, currentLocation.longitude], {
            radius: 100,
            fillColor: 'blue',
            fillOpacity: 0.1,
            color: 'blue',
            weight: 2,
            opacity: 0.5,
            dashArray: '5, 5'
          }).addTo(map);

          // Add 50m battle circle
          L.circle([currentLocation.latitude, currentLocation.longitude], {
            radius: 50,
            fillColor: 'red',
            fillOpacity: 0.05,
            color: 'red',
            weight: 1,
            opacity: 0.3,
            dashArray: '3, 3'
          }).addTo(map);
        }

        // Handle map clicks
        map.on('click', (e: any) => {
          if (onLocationUpdate) {
            onLocationUpdate({ latitude: e.latlng.lat, longitude: e.latlng.lng });
          }
        });

        leafletMapRef.current = map;
        
        if (mounted) {
          setMapLoaded(true);
          toast({
            title: "Map Loaded",
            description: "Interactive map is ready. You can now drag and zoom!",
          });
        }

      } catch (error) {
        console.error('Error initializing map:', error);
        if (mounted) {
          toast({
            variant: "destructive",
            title: "Map Error",
            description: "Failed to load interactive map.",
          });
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }
    };
  }, []);

  // Update map center when location changes
  useEffect(() => {
    if (leafletMapRef.current && currentLocation) {
      leafletMapRef.current.setView([currentLocation.latitude, currentLocation.longitude], 16);
    }
  }, [currentLocation]);

  const returnToUserLocation = () => {
    if (leafletMapRef.current && currentLocation) {
      leafletMapRef.current.setView([currentLocation.latitude, currentLocation.longitude], 16);
      toast({
        title: "Returned to Your Location",
        description: "Map centered on your current position.",
      });
    }
  };

  return (
    <div className="w-full h-full relative">
      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-green-100 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center">
            <div className="text-lg text-green-800 mb-2">Loading interactive map...</div>
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}

      {/* Map container */}
      <div 
        ref={mapRef} 
        className="w-full h-full z-0"
        style={{ height: '100%', width: '100%' }}
      />

      {/* Return to user location button */}
      {mapLoaded && currentLocation && (
        <button
          onClick={returnToUserLocation}
          className="absolute bottom-32 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg hover:bg-white transition-colors"
          title="Return to your location"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </button>
      )}

      {/* Range legend */}
      {mapLoaded && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>💬 100m - Messaging</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>⚔️ 50m - Battle</span>
            </div>
          </div>
        </div>
      )}

      {/* Status indicator */}
      {mapLoaded && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-medium">Map Ready</span>
          </div>
          {currentLocation && (
            <div className="text-xs text-gray-600 mt-1">
              {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}