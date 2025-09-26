"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart2, MessageSquare, Settings, Swords, LocateFixed, QrCode } from 'lucide-react';
import { LeaderboardSheet } from './new-leaderboard-sheet';
import { SettingsSheet } from './settings-sheet';
import { ChatSheet } from './chat-sheet';
import { BattleDialog } from './battle-dialog';
import { QRBattleSystem } from './qr-battle-system';
import { BattleManager } from './battle-manager';
import InteractiveMap from './interactive-map';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { doc, setDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { User, onAuthStateChanged } from 'firebase/auth';

export default function GameUI() {
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [battleDialogOpen, setBattleDialogOpen] = useState(false);
  const [qrBattleOpen, setQrBattleOpen] = useState(false);
  const [battleManagerOpen, setBattleManagerOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [activeBattle, setActiveBattle] = useState<{ battleId: string; opponentId: string; opponentName: string } | null>(null);
  const [chatPlayer, setChatPlayer] = useState<any>(null);
  const [nearbyPlayers, setNearbyPlayers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{username: string, email: string, university?: string} | null>(null);
  const [showMockLocationDialog, setShowMockLocationDialog] = useState(false);
  const [mockLat, setMockLat] = useState('');
  const [mockLng, setMockLng] = useState('');
  const { toast } = useToast(); 

  const updateLocation = (forceUpdate = false) => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to share your location.",
      });
      return;
    }

    // If we already have a location and this isn't a forced update, skip
    if (currentLocation && !forceUpdate) {
      toast({
        title: "Location Already Available",
        description: "Your location is already shared. Use the location button if you want to refresh it.",
      });
      return;
    }

    // Check for Geolocation Support
    if ("geolocation" in navigator) {
      // Show loading toast
      toast({
        title: "Requesting location access...",
        description: "Please allow location access when prompted by your browser.",
      });

      // Request Current Position - This will trigger the browser permission prompt
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Success callback: Get latitude and longitude
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
          
          try {
            console.log(`Saving location for user ${user.uid}:`, { latitude, longitude });
            
            // Get the username from Firestore users collection
            let username = user.displayName || 'Anonymous';
            try {
              const { getDoc, doc: firestoreDoc } = await import('firebase/firestore');
              const userDoc = await getDoc(firestoreDoc(db, 'users', user.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                username = userData.username || user.displayName || 'Anonymous';
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
            
            const userLocationRef = doc(db, 'locations', user.uid);
            await setDoc(userLocationRef, {
              location: new GeoPoint(latitude, longitude),
              timestamp: serverTimestamp(),
              userId: user.uid,
              username: username,
            }, { merge: true });
            
            console.log("Location saved successfully to Firestore");
            setCurrentLocation({ latitude, longitude }); // Update local state
            toast({
              title: "Location Updated!",
              description: "Your location has been shared successfully.",
            });
          } catch (error) {
            console.error("Error updating location:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            toast({
              variant: "destructive",
              title: "Error",
              description: `Could not update your location: ${errorMessage}`,
            });
          }
        },
        (error) => {
          // Error callback: Handle different error types
          console.error("Geolocation error:", error);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.error("User denied the request for Geolocation.");
              toast({
                variant: "destructive",
                title: "Location Access Denied",
                description: "Location denied. You can set a mock location for testing.",
                action: (
                  <button 
                    onClick={() => setShowMockLocationDialog(true)}
                    className="text-sm bg-white text-red-500 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Set Mock Location
                  </button>
                ),
              });
              break;
            case error.POSITION_UNAVAILABLE:
              console.error("Location information is unavailable.");
              toast({
                variant: "destructive",
                title: "Location Unavailable",
                description: "Your location could not be determined. Please check your GPS/location services.",
              });
              break;
            case error.TIMEOUT:
              console.error("The request to get user location timed out.");
              toast({
                variant: "destructive",
                title: "Location Request Timed Out",
                description: "The request took too long. Please try again.",
              });
              break;
            default:
              console.error("An unknown error occurred.");
              toast({
                variant: "destructive",
                title: "Unknown Error",
                description: "An unknown error occurred while getting your location.",
              });
              break;
          }
        },
        {
          enableHighAccuracy: true, // Request high accuracy, potentially using GPS
          timeout: 10000,           // Maximum time (in ms) to wait for a position
          maximumAge: 0            // Don't use a cached position
        }
      );
    } else {
      // Geolocation is not supported
      console.error("Geolocation is not supported by this browser.");
      toast({
        variant: "destructive",
        title: "Geolocation Not Supported",
        description: "Your browser does not support location services.",
      });
    }
  };

  // Function to fetch user profile data
  const fetchUserProfile = async (user: User) => {
    console.log('Fetching user profile for:', user.uid);
    try {
      const { getDoc, doc: firestoreDoc } = await import('firebase/firestore');
      const userDoc = await getDoc(firestoreDoc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User data from Firestore:', userData);
        const profile = {
          username: userData.username || user.displayName || 'Anonymous',
          email: user.email || '',
          university: userData.university || ''
        };
        console.log('Setting profile:', profile);
        setCurrentUserProfile(profile);
      } else {
        console.log('User document does not exist in Firestore');
        const profile = {
          username: user.displayName || 'Anonymous',
          email: user.email || '',
          university: ''
        };
        console.log('Setting fallback profile:', profile);
        setCurrentUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const profile = {
        username: user.displayName || 'Anonymous',
        email: user.email || '',
        university: ''
      };
      console.log('Setting error fallback profile:', profile);
      setCurrentUserProfile(profile);
    }
  };

  // Mock location function for development/testing
  const setMockLocation = async (lat: number, lng: number) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      console.log(`Setting mock location for user ${user.uid}:`, { lat, lng });
      
      // Get the username from Firestore users collection
      let username = user.displayName || 'Anonymous';
      try {
        const { getDoc, doc: firestoreDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(firestoreDoc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          username = userData.username || user.displayName || 'Anonymous';
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
      
      const userLocationRef = doc(db, 'locations', user.uid);
      await setDoc(userLocationRef, {
        location: new GeoPoint(lat, lng),
        timestamp: serverTimestamp(),
        userId: user.uid,
        username: username,
      }, { merge: true });
      
      console.log("Mock location saved successfully to Firestore");
      setCurrentLocation({ latitude: lat, longitude: lng });
      setShowMockLocationDialog(false);
      toast({
        title: "Mock Location Set!",
        description: `Location set to ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
    } catch (error) {
      console.error("Error setting mock location:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not set mock location",
      });
    }
  };

  // Function to clean up user data when exiting the app
  const cleanupUserData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      
      // Remove user's location data
      const userLocationRef = doc(db, 'locations', user.uid);
      
      // Use a timeout to ensure cleanup doesn't hang
      const cleanupPromise = deleteDoc(userLocationRef);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cleanup timeout')), 3000)
      );
      
      await Promise.race([cleanupPromise, timeoutPromise]);
      console.log('User location data cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up user data:', error);
      // Don't block the exit process on cleanup errors
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If user is logging out, clean up their data first
      if (!user && currentUser) {
        cleanupUserData();
      }
      
      setCurrentUser(user);
      if (user) {
        fetchUserProfile(user);
      } else {
        setCurrentUserProfile(null);
        setCurrentLocation(null);
      }
    });

    const user = auth.currentUser;
    if (user) {
      // First try to get stored location from database
      const fetchStoredLocation = async () => {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const userLocationDoc = await getDoc(doc(db, 'locations', user.uid));
          if (userLocationDoc.exists()) {
            const data = userLocationDoc.data();
            if (data.location && data.location.latitude && data.location.longitude) {
              setCurrentLocation({
                latitude: data.location.latitude,
                longitude: data.location.longitude
              });
              return; // Don't update location if we have stored data
            }
          }
        } catch (error) {
          console.error('Error fetching stored location:', error);
        }
        
        // If no stored location, just wait for user to manually enable location
        console.log('No stored location found. User will need to manually enable location sharing.');
      };

      fetchStoredLocation();
      
      // No automatic periodic updates - only manual updates

      // Set up event listeners for app exit/close
      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        // Clean up user data when page is about to unload
        console.log('User is leaving the app, cleaning up location data...');
        cleanupUserData();
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          // Page is hidden (user switched tabs, minimized browser, etc.)
          cleanupUserData();
        }
      };

      const handlePageHide = () => {
        // Page is being hidden or unloaded
        cleanupUserData();
      };

      // Add event listeners
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', handlePageHide);

      return () => {
        unsubscribe();
        
        // Clean up event listeners
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', handlePageHide);
        
        // Final cleanup when component unmounts
        cleanupUserData();
      };
    } else {
      return () => unsubscribe();
    }
  }, []);

  return (
    <>
      {/* Location Permission Banner */}
      {currentUser && !currentLocation && !showMockLocationDialog && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-red-500/95 backdrop-blur-sm text-white p-6 rounded-lg shadow-2xl max-w-sm text-center">
          <div className="text-2xl mb-3">📍</div>
          <h3 className="font-bold text-lg mb-2">Enable Location Sharing</h3>
          <p className="text-sm mb-4 opacity-90">
            To find nearby players and enable battles, you need to share your location. 
            Click the button below when you're ready.
          </p>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => updateLocation(true)}
              className="bg-white text-red-500 hover:bg-gray-100 font-semibold"
              size="sm"
            >
              Share My Location
            </Button>
            <Button 
              onClick={() => setShowMockLocationDialog(true)}
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/20"
              size="sm"
            >
              Use Mock Location (Dev)
            </Button>
          </div>
          <p className="text-xs mt-3 opacity-75">
            Your browser will show a permission dialog
          </p>
        </div>
      )}

      {/* Mock Location Dialog */}
      {showMockLocationDialog && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-white/95 backdrop-blur-sm p-6 rounded-lg shadow-2xl max-w-sm">
          <h3 className="font-bold text-lg mb-4">Set Mock Location</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter coordinates for testing. Some popular locations:
          </p>
          <div className="space-y-2 mb-4 text-xs">
            <button 
              onClick={() => { setMockLat('40.7128'); setMockLng('-74.0060'); }}
              className="block w-full text-left p-2 bg-gray-100 rounded hover:bg-gray-200"
            >
              🗽 NYC: 40.7128, -74.0060
            </button>
            <button 
              onClick={() => { setMockLat('51.5074'); setMockLng('-0.1278'); }}
              className="block w-full text-left p-2 bg-gray-100 rounded hover:bg-gray-200"
            >
              🇬🇧 London: 51.5074, -0.1278
            </button>
            <button 
              onClick={() => { setMockLat('37.7749'); setMockLng('-122.4194'); }}
              className="block w-full text-left p-2 bg-gray-100 rounded hover:bg-gray-200"
            >
              🌉 SF: 37.7749, -122.4194
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="number"
              placeholder="Latitude (e.g., 40.7128)"
              value={mockLat}
              onChange={(e) => setMockLat(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              step="any"
            />
            <input
              type="number"
              placeholder="Longitude (e.g., -74.0060)"
              value={mockLng}
              onChange={(e) => setMockLng(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              step="any"
            />
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  const lat = parseFloat(mockLat);
                  const lng = parseFloat(mockLng);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setMockLocation(lat, lng);
                  } else {
                    toast({
                      variant: "destructive",
                      title: "Invalid coordinates",
                      description: "Please enter valid latitude and longitude values",
                    });
                  }
                }}
                className="bg-blue-500 text-white hover:bg-blue-600 flex-1"
                size="sm"
              >
                Set Location
              </Button>
              <Button 
                onClick={() => setShowMockLocationDialog(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Display */}
      {currentUser && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
              {(currentUserProfile?.username || currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-sm">
                {currentUserProfile?.username || currentUser.displayName || 'Loading Username...'}
              </div>
              {currentUserProfile?.university && (
                <div className="text-xs text-gray-600">
                  🎓 {currentUserProfile.university}
                </div>
              )}
              {!currentUserProfile?.university && currentUser.email && (
                <div className="text-xs text-gray-500">
                  {currentUser.email}
                </div>
              )}
              {currentLocation && (
                <div className="text-xs text-green-600 font-medium">
                  📍 Location Active
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-20 left-4 flex flex-col gap-3 z-20">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full w-14 h-14 shadow-lg"
                        onClick={() => updateLocation(true)}
                        aria-label="Update Location"
                    >
                        <LocateFixed className="w-7 h-7" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right"><p>{currentLocation ? 'Refresh Location' : 'Share My Location'}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full w-14 h-14 shadow-lg"
                        onClick={() => setLeaderboardOpen(true)}
                        aria-label="Open Leaderboard"
                    >
                        <BarChart2 className="w-7 h-7" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Leaderboard</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
         <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full w-14 h-14 shadow-lg"
                        onClick={() => setChatOpen(true)}
                        aria-label="Open Chat"
                    >
                        <MessageSquare className="w-7 h-7" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Chat</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                     <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full w-14 h-14 shadow-lg"
                        onClick={() => setSettingsOpen(true)}
                        aria-label="Open Settings"
                    >
                        <Settings className="w-7 h-7" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Settings</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      {/* QR Battle Button */}
      {selectedPlayer && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
          <Button
            size="lg"
            className="h-16 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-2xl text-lg font-bold animate-pulse"
            onClick={() => setQrBattleOpen(true)}
          >
            <QrCode className="w-6 h-6 mr-3" />
            Challenge {selectedPlayer.username}
          </Button>
        </div>
      )}

      {/* Interactive Map */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap
          currentLocation={currentLocation}
          onPlayerSelect={(player: any) => setSelectedPlayer(player)}
          onStartChat={(player: any) => {
            setChatPlayer(player);
            setChatOpen(true);
          }}
          onNearbyPlayersChange={(players: any[]) => setNearbyPlayers(players)}
        />
      </div>

      <LeaderboardSheet open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ChatSheet 
        open={chatOpen} 
        onOpenChange={setChatOpen}
        selectedPlayer={chatPlayer}
        nearbyPlayers={nearbyPlayers}
      />
      <BattleDialog open={battleDialogOpen} onOpenChange={setBattleDialogOpen} />
      
      <QRBattleSystem
        isOpen={qrBattleOpen}
        onClose={() => setQrBattleOpen(false)}
        selectedPlayer={selectedPlayer}
        onBattleStart={(battleId, opponentId) => {
          setActiveBattle({
            battleId,
            opponentId,
            opponentName: selectedPlayer?.username || 'Unknown Player'
          });
          setBattleManagerOpen(true);
          setQrBattleOpen(false);
        }}
      />

      {activeBattle && (
        <BattleManager
          isOpen={battleManagerOpen}
          onClose={() => {
            setBattleManagerOpen(false);
            setActiveBattle(null);
            setSelectedPlayer(null);
          }}
          battleId={activeBattle.battleId}
          opponentId={activeBattle.opponentId}
          opponentName={activeBattle.opponentName}
        />
      )}
    </>
  );
}
