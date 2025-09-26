"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart2, MessageSquare, Settings, Swords } from 'lucide-react';
import { LeaderboardSheet } from './leaderboard-sheet';
import { SettingsSheet } from './settings-sheet';
import { ChatSheet } from './chat-sheet';
import { BattleDialog } from './battle-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export default function GameUI() {
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [battleDialogOpen, setBattleDialogOpen] = useState(false);

  // This would be derived from real-time GPS data
  const isPlayerNearby = true; 

  return (
    <>
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

      {isPlayerNearby && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <Button
            size="lg"
            className="h-16 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-2xl text-lg font-bold animate-pulse"
            onClick={() => setBattleDialogOpen(true)}
          >
            <Swords className="w-6 h-6 mr-3" />
            Battle Nearby Player
          </Button>
        </div>
      )}

      <LeaderboardSheet open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ChatSheet open={chatOpen} onOpenChange={setChatOpen} />
      <BattleDialog open={battleDialogOpen} onOpenChange={setBattleDialogOpen} />
    </>
  );
}
