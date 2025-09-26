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
  const { toast } = useToast(); 

  const updateLocation = () => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to share your location.",
      });
      return;
    }

    if (!navigator.geolocation) {
       toast({
        variant: "destructive",
        title: "Geolocation is not supported by your browser",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        console.log(`Saving location for user ${user.uid}:`, { latitude, longitude });
        const userLocationRef = doc(db, 'locations', user.uid);
        await setDoc(userLocationRef, {
          location: new GeoPoint(latitude, longitude),
          timestamp: serverTimestamp(),
          userId: user.uid,
          username: user.displayName || user.email,
        }, { merge: true });
        
        console.log("Location saved successfully to Firestore");
        setCurrentLocation({ latitude, longitude }); // Update local state
        toast({
          title: "Location Updated!",
          description: "Your location has been shared.",
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
    }, (error) => {
      console.error("Geolocation error:", error);
      let message = "Location access denied or unavailable.";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = "Location access was denied. Please allow location access in your browser.";
          break;
        case error.POSITION_UNAVAILABLE:
          message = "Location information is unavailable.";
          break;
        case error.TIMEOUT:
          message = "Location request timed out.";
          break;
      }
      toast({
        variant: "destructive",
        title: "Unable to retrieve your location",
        description: message,
      });
    });
  };

  useEffect(() => {
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
        
        // If no stored location, get current GPS location
        updateLocation();
      };

      fetchStoredLocation();
      
      // Update location every 5 minutes
      const interval = setInterval(updateLocation, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <>
      <div className="absolute top-4 left-4 flex flex-col gap-3">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full w-14 h-14 shadow-lg"
                        onClick={updateLocation}
                        aria-label="Update Location"
                    >
                        <LocateFixed className="w-7 h-7" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right"><p>Share My Location</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-3">
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
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
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
      <div className="absolute inset-0 -z-10">
        <InteractiveMap 
          currentLocation={currentLocation}
          onPlayerSelect={(player) => setSelectedPlayer(player)}
          onLocationUpdate={(location) => setCurrentLocation(location)}
        />
      </div>

      <LeaderboardSheet open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ChatSheet open={chatOpen} onOpenChange={setChatOpen} />
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
