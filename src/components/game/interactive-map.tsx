"use client";

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { LatLngExpression, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, GeoPoint, getDoc } from 'firebase/firestore';
import { User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import Leaflet components dynamically to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

interface PlayerLocation {
  id: string;
  username: string;
  university: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: any;
  wins: number;
  losses: number;
}

interface InteractiveMapProps {
  currentLocation: { latitude: number; longitude: number } | null;
  onPlayerSelect?: (player: PlayerLocation) => void;
  onLocationUpdate?: (location: { latitude: number; longitude: number }) => void;
  onStartChat?: (player: PlayerLocation) => void;
}

// Custom hook for map events
function MapEvents({ onLocationUpdate }: { onLocationUpdate: (lat: number, lng: number) => void }) {
  const { useMapEvents } = require('react-leaflet');
  
  const map = useMapEvents({
    click: (e: any) => {
      const { lat, lng } = e.latlng;
      onLocationUpdate(lat, lng);
    },
  });
  return null;
}

export default function InteractiveMap({ currentLocation, onPlayerSelect, onLocationUpdate, onStartChat }: InteractiveMapProps) {
  const [players, setPlayers] = useState<PlayerLocation[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([40.7128, -74.0060]); // Default to NYC
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocationLoaded, setUserLocationLoaded] = useState(false);
  const mapRef = useRef<LeafletMap>(null);
  const { toast } = useToast();

  // Create custom icon for current user
  const createCustomIcon = (isCurrentUser = false) => {
    if (typeof window === 'undefined') return undefined;
    
    const L = require('leaflet');
    const iconSize = isCurrentUser ? [40, 40] : [30, 30];
    const iconColor = isCurrentUser ? '#3b82f6' : '#ef4444';
    
    return L.divIcon({
      html: `<div style="
        width: ${iconSize[0]}px;
        height: ${iconSize[1]}px;
        background-color: ${iconColor};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        color: white;
        font-size: ${isCurrentUser ? '20px' : '16px'};
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>`,
      className: 'custom-user-icon',
      iconSize: iconSize,
      iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
    });
  };

  // Fetch user's stored location from database on component mount
  useEffect(() => {
    const fetchUserLocation = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userLocationDoc = await getDoc(doc(db, 'locations', user.uid));
        if (userLocationDoc.exists()) {
          const data = userLocationDoc.data();
          if (data.location && data.location.latitude && data.location.longitude) {
            const storedLocation = {
              latitude: data.location.latitude,
              longitude: data.location.longitude
            };
            setMapCenter([storedLocation.latitude, storedLocation.longitude]);
            setUserLocationLoaded(true);
            
            // Update the current location prop if it's not set
            if (!currentLocation) {
              // Call the parent component to update current location
              onLocationUpdate?.(storedLocation);
            }
            
            toast({
              title: "Location Loaded",
              description: `Map centered on your stored location: ${storedLocation.latitude.toFixed(4)}, ${storedLocation.longitude.toFixed(4)}`,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user location from database:', error);
      }
    };

    fetchUserLocation();
  }, []); // Run once on mount

  // Update map center when current location changes
  useEffect(() => {
    if (currentLocation) {
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
      // Programmatically move the map to the new center
      if (mapRef.current) {
        mapRef.current.setView([currentLocation.latitude, currentLocation.longitude], 16);
      }
    }
  }, [currentLocation]);

  // Listen for nearby players
  useEffect(() => {
    if (!currentLocation) return;

    const unsubscribe = onSnapshot(collection(db, 'locations'), (snapshot) => {
      const nearbyPlayers: PlayerLocation[] = [];
      const currentUser = auth.currentUser;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id === currentUser?.uid) return; // Skip current user

        if (data.location && data.location.latitude && data.location.longitude) {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            data.location.latitude,
            data.location.longitude
          );

          // Show players within 1km for now (you can adjust this)
          if (distance <= 1000) {
            nearbyPlayers.push({
              id: doc.id,
              username: data.username || 'Anonymous',
              university: data.university || 'Unknown',
              location: {
                latitude: data.location.latitude,
                longitude: data.location.longitude,
              },
              timestamp: data.timestamp,
              wins: data.wins || 0,
              losses: data.losses || 0,
            });
          }
        }
      });

      setPlayers(nearbyPlayers);
    });

    return () => unsubscribe();
  }, [currentLocation]);

  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon1 - lon2) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handlePlayerClick = (player: PlayerLocation) => {
    if (!currentLocation) return;

    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      player.location.latitude,
      player.location.longitude
    );

    if (distance <= 100) { // Within 100 meters for messaging
      if (distance <= 50) {
        // Within 50 meters - can battle
        onPlayerSelect?.(player);
        toast({
          title: "Player in Range!",
          description: `${player.username} is nearby. You can challenge them to a battle!`,
        });
      } else {
        // Within 100 meters but not 50 - can only message
        onStartChat?.(player);
        toast({
          title: "Message Player",
          description: `${player.username} is in messaging range (${Math.round(distance)}m away). Starting chat...`,
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Too Far Away",
        description: `You need to be within 100m of ${player.username} to message them. Currently ${Math.round(distance)}m away.`,
      });
    }
  };

  const returnToUserLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.setView([currentLocation.latitude, currentLocation.longitude], 16);
      toast({
        title: "Returned to Your Location",
        description: "Map centered on your current position.",
      });
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    // Optional: Allow manual location update by clicking on map
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'locations', user.uid), {
        location: new GeoPoint(lat, lng),
        timestamp: serverTimestamp(),
      });
      
      onLocationUpdate?.({ latitude: lat, longitude: lng });
      
      toast({
        title: "Location Updated",
        description: "Your location has been updated on the map.",
      });
    } catch (error) {
      console.error("Error updating location:", error);
    }
  };

  const refreshLocationFromDatabase = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userLocationDoc = await getDoc(doc(db, 'locations', user.uid));
      if (userLocationDoc.exists()) {
        const data = userLocationDoc.data();
        if (data.location && data.location.latitude && data.location.longitude) {
          const storedLocation = {
            latitude: data.location.latitude,
            longitude: data.location.longitude
          };
          setMapCenter([storedLocation.latitude, storedLocation.longitude]);
          onLocationUpdate?.(storedLocation);
          
          // Move map to the location
          if (mapRef.current) {
            mapRef.current.setView([storedLocation.latitude, storedLocation.longitude], 16);
          }
          
          toast({
            title: "Location Refreshed",
            description: `Map updated to your database location: ${storedLocation.latitude.toFixed(4)}, ${storedLocation.longitude.toFixed(4)}`,
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "No Stored Location",
          description: "No location found in database. Please allow GPS access to update your location.",
        });
      }
    } catch (error) {
      console.error('Error refreshing location from database:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh location from database.",
      });
    }
  };

  if (typeof window === 'undefined') {
    return (
      <div className="w-full h-full bg-green-100 flex items-center justify-center">
        <div className="text-lg text-green-800">Loading map...</div>
      </div>
    );
  }

  const handleMapReady = () => {
    setMapLoaded(true);
  };

  return (
    <div className="w-full h-full relative">
      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-green-100 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-lg text-green-800 mb-2">Loading interactive map...</div>
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}
      
      {/* Location status indicator */}
      {mapLoaded && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${userLocationLoaded ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="font-medium">
                {userLocationLoaded ? 'Location Found' : 'Searching...'}
              </span>
            </div>
            <button
              onClick={refreshLocationFromDatabase}
              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors"
              title="Refresh location from database"
            >
              ↻
            </button>
          </div>
          {currentLocation && (
            <div className="text-xs text-gray-600 mt-1">
              {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </div>
          )}
        </div>
      )}

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
              <span>100m - Messaging Range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>50m - Battle Range</span>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={16}
        className="w-full h-full z-0"
        ref={mapRef}
        whenReady={handleMapReady}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        scrollWheelZoom={true}
        boxZoom={true}
        keyboard={true}
      >
        {/* Grayscale terrain-style tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="grayscale-map"
        />
        
        <MapEvents onLocationUpdate={handleMapClick} />

        {/* Current user marker and messaging range circle */}
        {currentLocation && (
          <>
            {/* 100m messaging range circle */}
            <Circle
              center={[currentLocation.latitude, currentLocation.longitude]}
              radius={100}
              pathOptions={{
                fillColor: 'blue',
                fillOpacity: 0.1,
                color: 'blue',
                weight: 2,
                opacity: 0.5,
                dashArray: '5, 5'
              }}
            />
            
            {/* 50m battle range circle */}
            <Circle
              center={[currentLocation.latitude, currentLocation.longitude]}
              radius={50}
              pathOptions={{
                fillColor: 'red',
                fillOpacity: 0.05,
                color: 'red',
                weight: 1,
                opacity: 0.3,
                dashArray: '3, 3'
              }}
            />
            
            {/* User marker */}
            <Marker
              position={[currentLocation.latitude, currentLocation.longitude]}
              icon={createCustomIcon(true)}
            >
              <Popup>
                <div className="text-center">
                  <strong>Your Location</strong>
                  <br />
                  <span className="text-sm text-gray-600">
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </span>
                  <br />
                  <span className="text-xs text-blue-600">
                    Blue circle: 100m messaging range
                  </span>
                  <br />
                  <span className="text-xs text-red-600">
                    Red circle: 50m battle range
                  </span>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Other players markers */}
        {players.map((player) => (
          <Marker
            key={player.id}
            position={[player.location.latitude, player.location.longitude]}
            icon={createCustomIcon(false)}
            eventHandlers={{
              click: () => handlePlayerClick(player),
            }}
          >
            <Popup>
              <div className="text-center min-w-[150px]">
                <strong>{player.username}</strong>
                <br />
                <span className="text-sm text-blue-600">{player.university}</span>
                <br />
                <span className="text-xs text-gray-600">
                  W: {player.wins} | L: {player.losses}
                </span>
                <br />
                <span className="text-xs text-gray-500">
                  Distance: {currentLocation ? 
                    Math.round(calculateDistance(
                      currentLocation.latitude,
                      currentLocation.longitude,
                      player.location.latitude,
                      player.location.longitude
                    )) : '?'}m
                </span>
                <br />
                <button
                  onClick={() => handlePlayerClick(player)}
                  className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Challenge
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}