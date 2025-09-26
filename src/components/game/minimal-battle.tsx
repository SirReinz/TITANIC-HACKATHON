"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { PongGame } from '../games/PongGame';

interface MinimalBattleProps {
  isOpen: boolean;
  onClose: () => void;
  battleId: string;
  opponentId?: string;
  opponentName?: string;
}

const MinimalBattleComponent = ({ isOpen, onClose, battleId, opponentId, opponentName }: MinimalBattleProps) => {
  console.log('⚔️ MinimalBattle render with battleId:', battleId, 'isOpen:', isOpen);
  const { toast } = useToast();
  const [battle, setBattle] = useState<any | null>(null);
  const [showGame, setShowGame] = useState(false);
  const [myReady, setMyReady] = useState(false);
  const [myGameFinished, setMyGameFinished] = useState(false);
  const [myGameWon, setMyGameWon] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const finishPollingRef = useRef<number | null>(null);

  const uid = auth.currentUser?.uid || null;

  const isPlayer1 = useMemo(() => {
    if (!battle || !uid) return false;
    return battle.player1?.id === uid;
  }, [battle, uid]);

  const opponentReady = useMemo(() => {
    if (!battle || !uid) return false;
    return isPlayer1 ? battle.player2?.ready : battle.player1?.ready;
  }, [battle, uid, isPlayer1]);

  const fetchBattle = useCallback(async () => {
    if (!battleId) return null;
    try {
      const resp = await fetch(`/api/mongo/battle-games?battleId=${encodeURIComponent(battleId)}`);
      if (resp.ok) {
        const json = await resp.json();
        return json.battleGame || null;
      }
      return null;
    } catch (e) {
      console.warn('fetchBattle error', e);
      return null;
    }
  }, [battleId]);

  useEffect(() => {
    let mounted = true;
    if (!isOpen || !battleId) return;

    const tick = async () => {
      // STOP POLLING when game is active to prevent interfering with game state
      if (showGame) {
        console.log('MinimalBattle: Stopping polling - game is active');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }

      const latest = await fetchBattle();
      if (!mounted) return;
      if (latest) {
        setBattle(latest);
        // Update my ready state from server
        const serverMyReady = isPlayer1 ? latest.player1?.ready : latest.player2?.ready;
        setMyReady(serverMyReady || false);
        
        // INSTANTLY START when both are ready
        if (latest.status === 'active') {
          setShowGame(true);
        }
      }
    };

    // Only start polling if game is not already active
    if (!showGame) {
      tick();
      pollingRef.current = window.setInterval(tick, 500);
    }

    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      if (finishPollingRef.current) clearInterval(finishPollingRef.current);
      finishPollingRef.current = null;
    };
  }, [isOpen, battleId, fetchBattle, isPlayer1, showGame]);

  const sendAction = useCallback(async (action: string, data?: any) => {
    if (!battleId || !uid) return false;
    try {
      const body = { battleId, playerId: uid, action, data };
      const resp = await fetch('/api/mongo/battle-games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return false;
      return true;
    } catch (e) {
      console.error('sendAction error', e);
      return false;
    }
  }, [battleId, uid]);

  const handleReady = useCallback(async () => {
    const ok = await sendAction('ready', { isPlayer1 });
    if (ok) {
      setMyReady(true);
    }
  }, [sendAction, isPlayer1]);

  // Memoized GameRunner to prevent PongGame from remounting on every parent re-render
  const GameRunner = useMemo(() => {
    const Runner: React.FC<{ gameId: string; onEnd: (playerWon: boolean) => void }> = ({ gameId, onEnd }) => {
      switch (gameId) {
        case 'pong':
          return (
            <PongGame
              key="stable-pong-game"
              roomId="singleplayer"
              playerId="player1"
              singlePlayer={true}
              onGameEnd={(winner: 'player1' | 'player2') => onEnd(winner === 'player1')}
            />
          );
        default:
          return (
            <div className="p-6">
              <p>Unknown game: {gameId}</p>
              <Button onClick={() => onEnd(false)}>Skip</Button>
            </div>
          );
      }
    };
    return Runner;
  }, []); // Empty dependency array - never recreate

  const handleGameEnd = useCallback(async (playerWon: boolean) => {
    console.log('🎮 Game finished! Player won:', playerWon);
    
    // Mark my game as finished and record if I won
    setMyGameFinished(true);
    setMyGameWon(playerWon);
    
    // Report my completion to battle-games API
    try {
      await sendAction('complete', { playerId: uid, finished: true, won: playerWon });
      console.log('✅ Reported completion to server');
    } catch (e) {
      console.error('❌ Failed to report completion:', e);
    }

    // Start polling for opponent finish status (define polling inline to avoid dependency issues)
    console.log('🔍 Starting opponent finish polling...', { playerWon, uid, opponentId });
    
    // Capture playerWon in closure for async function
    const myWon = playerWon;
    
    const checkOpponentStatus = async () => {
      try {
        const latest = await fetchBattle();
        if (!latest) return;

        // Check if opponent has finished their game
        const opponentFinished = isPlayer1 ? latest.player2?.finished : latest.player1?.finished;
        const opponentWon = isPlayer1 ? latest.player2?.won : latest.player1?.won;
        
        console.log('🏁 Opponent status:', { opponentFinished, opponentWon, myWon });
        
        if (opponentFinished) {
          // Stop polling
          if (finishPollingRef.current) {
            clearInterval(finishPollingRef.current);
            finishPollingRef.current = null;
          }
          
          // Determine battle winner
          let battleWinner: string | null = null;
          if (myWon && opponentWon) {
            // Both won their games - tie situation
            battleWinner = null;
            toast({ title: 'Battle Tie!', description: 'Both players won their games - no leaderboard update' });
          } else if (myWon && !opponentWon) {
            // I won, opponent lost - I get the battle win
            battleWinner = uid;
            toast({ title: 'Battle Victory!', description: 'You won the battle and earn a leaderboard win!' });
          } else if (!myWon && opponentWon) {
            // I lost, opponent won - opponent gets the battle win
            battleWinner = opponentId || null;
            toast({ variant: 'destructive', title: 'Battle Defeat', description: 'Opponent won the battle' });
          } else {
            // Both lost - no winner
            battleWinner = null;
            toast({ title: 'Battle Draw', description: 'Both players lost - no leaderboard update' });
          }
          
          // Update leaderboard if there's a winner
          if (battleWinner) {
            try {
              console.log('🏆 Updating leaderboard for winner:', battleWinner);

              // Get winner and loser data  
              const winnerResp = await fetch(`/api/mongo/users?uid=${encodeURIComponent(battleWinner)}`);
              const winnerJson = winnerResp.ok ? await winnerResp.json() : null;
              const winner = winnerJson?.user || { uid: battleWinner, username: battleWinner === uid ? (auth.currentUser?.displayName || '') : (opponentName || battleWinner) };

              const loserId = battleWinner === uid ? opponentId : uid;
              const loserResp = await fetch(`/api/mongo/users?uid=${encodeURIComponent(loserId!)}`);
              const loserJson = loserResp.ok ? await loserResp.json() : null;
              const loser = loserJson?.user || { uid: loserId, username: loserId === uid ? (auth.currentUser?.displayName || '') : (opponentName || loserId) };

              // Update winner stats
              const winnerWins = (winner?.wins || 0) + 1;
              const winnerLosses = winner?.losses || 0;
              await fetch('/api/mongo/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  uid: winner.uid, 
                  username: winner.username, 
                  wins: winnerWins, 
                  losses: winnerLosses 
                }),
              });

              // Update loser stats
              const loserWins = loser?.wins || 0;
              const loserLosses = (loser?.losses || 0) + 1;
              await fetch('/api/mongo/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  uid: loser.uid, 
                  username: loser.username, 
                  wins: loserWins, 
                  losses: loserLosses 
                }),
              });

              console.log('✅ Leaderboard updated successfully');
            } catch (e) {
              console.error('❌ Error updating leaderboard:', e);
            }
          }
          
          // Close battle after delay
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      } catch (e) {
        console.error('❌ Error checking opponent status:', e);
      }
    };

    // Start polling every 1 second
    if (finishPollingRef.current) {
      clearInterval(finishPollingRef.current);
    }
    finishPollingRef.current = window.setInterval(checkOpponentStatus, 1000);
    
    // Also check immediately
    checkOpponentStatus();
  }, [uid, sendAction, opponentId, isPlayer1, fetchBattle, toast, onClose]);





  // MinimalBattle automatically starts the game - no ready screen
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Playing: {battle?.gameName || battle?.gameId || 'Game'}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          {battle?.gameId ? (
            <GameRunner gameId={battle.gameId} onEnd={handleGameEnd} />
          ) : (
            <div className="text-center p-8">
              <div>Loading game...</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const MinimalBattle = React.memo(MinimalBattleComponent);
export default MinimalBattle;
