"use client";

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { LatLngExpression, Map as LeafletMap } from 'leaflet';
import { auth } from '@/lib/firebase';
import { User as UserIcon, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
  onStartChat?: (player: PlayerLocation) => void;
  onNearbyPlayersChange?: (players: PlayerLocation[]) => void;
}



export default function InteractiveMap({ currentLocation, onPlayerSelect, onStartChat, onNearbyPlayersChange }: InteractiveMapProps) {
  const [players, setPlayers] = useState<PlayerLocation[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([40.7128, -74.0060]); // Default to NYC
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocationLoaded, setUserLocationLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const mapRef = useRef<LeafletMap>(null);
  const playersIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Create custom icon for users
  const createCustomIcon = (isCurrentUser = false, distance = 0) => {
    if (typeof window === 'undefined') return undefined;
    
    const L = require('leaflet');
    const iconSize = isCurrentUser ? [40, 40] : [30, 30];
    
    let iconColor = '#ef4444'; // Default red (out of range)
    if (isCurrentUser) {
      iconColor = '#3b82f6'; // Blue for current user
    } else if (distance <= 50) {
      iconColor = '#f59e0b'; // Orange for battle range (≤50m)
    } else if (distance <= 100) {
      iconColor = '#10b981'; // Green for messaging range (≤100m)
    }
    
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

  // Fetch user's stored location from MongoDB on component mount
  useEffect(() => {
    const fetchUserLocation = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Fetch user location from MongoDB
        const response = await fetch(`/api/mongo/locations?uid=${user.uid}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.location && result.location.latitude && result.location.longitude) {
            const storedLocation = {
              latitude: result.location.latitude,
              longitude: result.location.longitude
            };
            setMapCenter([storedLocation.latitude, storedLocation.longitude]);
            setUserLocationLoaded(true);
            
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

  // Manual load function for nearby players - NO AUTOMATIC INTERVALS
  const loadNearbyPlayers = async () => {
    if (!currentLocation) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      console.log(`🗺️ Manual fetch of nearby players at: ${currentLocation.latitude}, ${currentLocation.longitude}`);

      // Fetch nearby players from MongoDB
      const response = await fetch(
        `/api/mongo/locations?lat=${currentLocation.latitude}&lng=${currentLocation.longitude}&radius=5&currentUserId=${currentUser.uid}`
      );
      
      if (!response.ok) {
        console.error('Failed to fetch nearby players from MongoDB');
        return;
      }

      const data = await response.json();
      if (!data.success) {
        console.error('MongoDB API returned error:', data.error);
        return;
      }

      const nearbyPlayers: PlayerLocation[] = data.players.map((player: any) => ({
        id: player.uid,
        username: player.username,
        university: player.university || 'Unknown University',
        location: {
          latitude: player.latitude,
          longitude: player.longitude
        },
        timestamp: new Date(player.timestamp),
        wins: player.wins || 0,
        losses: player.losses || 0
      }));

      console.log(`Found ${nearbyPlayers.length} nearby players from MongoDB`);
      setPlayers(nearbyPlayers);
      
      // Filter players within messaging range (100m) and notify parent component
      const messagingRangePlayers = nearbyPlayers.filter(player => {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          player.location.latitude,
          player.location.longitude
        );
        return distance <= 100;
      });
      
      console.log(`Players in messaging range (100m): ${messagingRangePlayers.length}`);
      onNearbyPlayersChange?.(messagingRangePlayers);
    } catch (error) {
      console.error("Error loading nearby players:", error);
    }
  };

  // Track previous location to only load players when location ACTUALLY changes significantly
  const prevLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  
  useEffect(() => {
    if (!currentLocation) return;
    
    // Only load nearby players if location changed significantly (more than 10 meters)
    const hasLocationChangedSignificantly = !prevLocationRef.current || 
      calculateDistance(
        prevLocationRef.current.latitude,
        prevLocationRef.current.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      ) > 10; // 10 meter threshold
      
    if (hasLocationChangedSignificantly) {
      console.log('📍 Location changed significantly - loading nearby players');
      loadNearbyPlayers();
      prevLocationRef.current = currentLocation;
    } else {
      console.log('📍 Location update too small - skipping nearby player refresh');
    }
  }, [currentLocation]);

  // Auto-refresh nearby players every 20 seconds
  useEffect(() => {
    if (!currentLocation) return;

    // Clear any existing interval first
    if (playersIntervalRef.current) {
      clearInterval(playersIntervalRef.current);
      playersIntervalRef.current = null;
    }

    // Set up 20-second interval for nearby player refresh
    console.log('👥 Setting up nearby players auto-refresh (10s)');
    playersIntervalRef.current = setInterval(() => {
      console.log('👥 Auto-refreshing nearby players...');
      loadNearbyPlayers();
    }, 10000); // 20 seconds

    return () => {
      if (playersIntervalRef.current) {
        console.log('👥 Cleaning up nearby players interval');
        clearInterval(playersIntervalRef.current);
        playersIntervalRef.current = null;
      }
    };
  }, [currentLocation ? true : false]); // Only depend on whether location exists, not the actual location value

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



  const refreshLocationFromDatabase = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Fetch user location from MongoDB
      const response = await fetch(`/api/mongo/locations?uid=${user.uid}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.location && result.location.latitude && result.location.longitude) {
          const storedLocation = {
            latitude: result.location.latitude,
            longitude: result.location.longitude
          };
          setMapCenter([storedLocation.latitude, storedLocation.longitude]);
          
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
    console.log('Map is ready and loaded');
    
    // Ensure map is draggable
    if (mapRef.current) {
      const map = mapRef.current;
      console.log('Map dragging enabled:', map.dragging?.enabled());
      console.log('Map options:', {
        dragging: map.options.dragging,
        touchZoom: map.options.touchZoom,
        scrollWheelZoom: map.options.scrollWheelZoom
      });
      
      // Force enable dragging if it's disabled
      if (map.dragging && !map.dragging.enabled()) {
        map.dragging.enable();
        console.log('Dragging manually enabled');
      }
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
            <div className="flex gap-1">
              <button
                onClick={refreshLocationFromDatabase}
                className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                title="Refresh location from database"
              >
                📍
              </button>
              <button
                onClick={loadNearbyPlayers}
                className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded hover:bg-green-50 transition-colors"
                title="Refresh nearby players"
              >
                👥
              </button>
            </div>
          </div>
          {currentLocation && (
            <div className="text-xs text-gray-600 mt-1">
              {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)} | Players: {players.length}
            </div>
          )}
        </div>
      )}

      {/* Map theme toggle and return to location buttons */}
      {mapLoaded && currentLocation && (
        <div className="absolute bottom-32 right-4 z-10 flex gap-2">
          <Button
            onClick={() => setIsDarkMode(!isDarkMode)}
            size="icon"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm hover:bg-white/100 shadow-lg h-12 w-12"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <Sun className="h-6 w-6" />
            ) : (
              <Moon className="h-6 w-6" />
            )}
          </Button>
          <button
            onClick={returnToUserLocation}
            className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg hover:bg-white transition-colors h-12 w-12 flex items-center justify-center"
            title="Return to your location"
          >
            <svg
              width="24"
              height="24"
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
        </div>
      )}

      {/* Range legend */}
      {mapLoaded && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>💬 100m - Messaging</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>⚔️ 50m - Battle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>❌ Out of Range</span>
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
        style={{ height: '100%', width: '100%' }}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        scrollWheelZoom={true}
        boxZoom={true}
        keyboard={true}
        zoomControl={false}
        attributionControl={true}
      >
        {/* Map tile layer with theme support */}
        <TileLayer
          key={isDarkMode ? "dark" : "light"}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className={isDarkMode ? "dark-map" : "grayscale-map"}
        />

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
        {players.map((player) => {
          const distance = currentLocation ? calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            player.location.latitude,
            player.location.longitude
          ) : 0;
          
          return (
            <Marker
              key={player.id}
              position={[player.location.latitude, player.location.longitude]}
              icon={createCustomIcon(false, distance)}
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
                    Distance: {Math.round(distance)}m
                  </span>
                  <br />
                  <div className="mt-2 space-y-1">
                    {distance <= 50 && (
                      <button
                        onClick={() => handlePlayerClick(player)}
                        className="block w-full px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
                      >
                        ⚔️ Challenge to Battle
                      </button>
                    )}
                    {distance <= 100 && (
                      <button
                        onClick={() => handlePlayerClick(player)}
                        className="block w-full px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                      >
                        💬 Start Chat
                      </button>
                    )}
                    {distance > 100 && (
                      <span className="text-xs text-gray-500">Too far away</span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}