"use client";

import { User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Player = {
  id: number;
  name: string;
  university: string;
  position: { top: string; left: string };
  isClose?: boolean;
  battledToday?: boolean;
};

const otherPlayers: Player[] = [
  { id: 2, name: 'RivalRick', university: 'Tech U', position: { top: '30%', left: '35%' } },
  { id: 3, name: 'ClashChloe', university: 'State University', position: { top: '60%', left: '70%' }, isClose: true },
  { id: 4, name: 'BattleBob', university: 'City College', position: { top: '75%', left: '20%' } },
  { id: 5, name: 'DuelistDana', university: 'Tech U', position: { top: '45%', left: '80%' }, battledToday: true },
];

const PlayerMarker = ({ player }: { player: Player }) => {
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

    let tooltipContent = `${player.name} - ${player.university}`;
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
  return (
    <div className="absolute inset-0 bg-secondary/50">
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}></div>
      <div className="relative w-full h-full">
        {/* Current User */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
          <div className="p-3 bg-primary rounded-full shadow-2xl animate-pulse">
            <User className="h-10 w-10 text-primary-foreground" />
          </div>
          <span className="mt-2 font-bold text-lg text-foreground bg-background/80 px-3 py-1 rounded-full">
            You
          </span>
        </div>

        {/* Other Players */}
        {otherPlayers.map(player => <PlayerMarker key={player.id} player={player} />)}
        
        <div className="absolute bottom-4 left-4 bg-background/80 p-2 rounded-lg shadow-md">
            <p className="text-xs text-muted-foreground">Map data not available.</p>
            <p className="text-xs text-muted-foreground">Using placeholder view.</p>
        </div>
      </div>
    </div>
  );
}
