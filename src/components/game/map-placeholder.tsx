"use client";

import { User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, GeoPoint } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useEffect, useState } from 'react';


type Player = {
  id: string;
  name: string;
  university?: string;
  position: { top: string; left: string };
  isClose?: boolean;
  battledToday?: boolean;
  location?: GeoPoint;
};

const MAP_WIDTH = 100; // vw
const MAP_HEIGHT = 100; // vh

// Haversine distance formula
const getDistance = (p1: GeoPoint, p2: GeoPoint) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
    const dLon = (p2.longitude - p1.longitude) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.latitude * Math.PI / 180) * Math.cos(p2.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d * 1000; // Distance in meters
};

const PlayerMarker = ({ player, currentUserPlayer }: { player: Player, currentUserPlayer?: Player }) => {
    const markerColor = player.isClose ? 'text-accent' : 'text-primary';
    const animation = player.isClose ? 'animate-pulse' : '';
    const opacity = player.battledToday ? 'opacity-50' : 'opacity-100';

    const content = (
         <div
            className={`absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${opacity} ${player.isClose ? 'scale-110' : ''}`}
            style={{ top: player.position.top, left: player.position.left }}
        >
            <div className={`p-2 bg-background rounded-full shadow-lg ${animation}`}>
                <User className={`h-8 w-8 ${markerColor}`} />
            </div>
            <span className="mt-1 text-xs font-bold text-foreground bg-background/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                {player.name}
            </span>
        </div>
    );

    let tooltipContent = `${player.name}`;
    if(currentUserPlayer && player.location && currentUserPlayer.location) {
        const distance = getDistance(player.location, currentUserPlayer.location);
        tooltipContent += ` - ${distance.toFixed(0)}m away`;
    }

    if (player.battledToday) {
        tooltipContent = `You have already battled ${player.name} today.`
    } else if (player.isClose) {
        tooltipContent = `Close enough to battle!`
    }

    return (
        <TooltipProvider>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    {content}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipContent}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default function MapPlaceholder() {
  const [user] = useAuthState(auth);
  
  const [locationsSnapshot, loading, error] = useCollection(
    query(collection(db, 'locations'))
  );

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserPlayer, setCurrentUserPlayer] = useState<Player | undefined>();

  useEffect(() => {
    if (locationsSnapshot) {
      const allPlayers: Player[] = locationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.username || 'Anonymous',
          location: data.location as GeoPoint,
          // These are placeholder positions for now
          position: { top: '50%', left: '50%' }
        };
      });

      const currentUserLocation = allPlayers.find(p => p.id === user?.uid)?.location;
      
      if(currentUserLocation) {
        const { minLat, maxLat, minLon, maxLon } = allPlayers.reduce((acc, player) => {
            if (player.location) {
                acc.minLat = Math.min(acc.minLat, player.location.latitude);
                acc.maxLat = Math.max(acc.maxLat, player.location.latitude);
                acc.minLon = Math.min(acc.minLon, player.location.longitude);
                acc.maxLon = Math.max(acc.maxLon, player.location.longitude);
            }
            return acc;
        }, { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity });

        const latRange = maxLat - minLat || 1;
        const lonRange = maxLon - minLon || 1;

        const processedPlayers = allPlayers.map(p => {
            let top = '50%';
            let left = '50%';
            if (p.location) {
                 left = `${((p.location.longitude - minLon) / lonRange) * (MAP_WIDTH - 10) + 5}%`;
                 top = `${100 - (((p.location.latitude - minLat) / latRange) * (MAP_HEIGHT - 20) + 10)}%`;
            }
            
            const distance = p.location ? getDistance(p.location, currentUserLocation) : Infinity;
            
            return {
                ...p,
                position: { top, left },
                isClose: distance < 100 && p.id !== user?.uid // 100 meters threshold
            }
        });
        
        const currentUserP = processedPlayers.find(p => p.id === user?.uid);
        if(currentUserP) {
             currentUserP.position = { top: '50%', left: '50%' };
             setCurrentUserPlayer(currentUserP);
        }

        setPlayers(processedPlayers.filter(p => p.id !== user?.uid));
      }
    }
  }, [locationsSnapshot, user]);

  return (
    <div className="absolute inset-0 bg-secondary/50">
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}></div>
      <div className="relative w-full h-full">
        {/* Current User */}
        {currentUserPlayer && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
            <div className="p-3 bg-primary rounded-full shadow-2xl animate-pulse">
                <User className="h-10 w-10 text-primary-foreground" />
            </div>
            <span className="mt-2 font-bold text-lg text-foreground bg-background/80 px-3 py-1 rounded-full">
                You
            </span>
            </div>
        )}


        {/* Other Players */}
        {players.map(player => <PlayerMarker key={player.id} player={player} currentUserPlayer={currentUserPlayer} />)}
        
        <div className="absolute bottom-4 left-4 bg-background/80 p-2 rounded-lg shadow-md">
            {loading && <p className="text-xs text-muted-foreground">Fetching players...</p>}
            {error && <p className="text-xs text-destructive">Error fetching players.</p>}
            {!loading && !error && (
              <>
                <p className="text-xs text-muted-foreground">Map is a relative representation.</p>
                <p className="text-xs text-muted-foreground">{players.length + (currentUserPlayer ? 1 : 0)} players online.</p>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
