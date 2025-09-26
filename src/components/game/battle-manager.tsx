"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp, increment } from 'firebase/firestore';
import { Heart, Zap, Trophy, X } from 'lucide-react';
import { PongGame } from './pong-game';

interface BattleManagerProps {
  isOpen: boolean;
  onClose: () => void;
  battleId: string;
  opponentId: string;
  opponentName: string;
}

interface BattleState {
  playerHp: number;
  opponentHp: number;
  maxHp: number;
  currentRound: number;
  totalRounds: number;
  playerWins: number;
  opponentWins: number;
  battleStatus: 'active' | 'finished';
  winner?: string;
}

export function BattleManager({ isOpen, onClose, battleId, opponentId, opponentName }: BattleManagerProps) {
  const [battleState, setBattleState] = useState<BattleState>({
    playerHp: 100,
    opponentHp: 100,
    maxHp: 100,
    currentRound: 1,
    totalRounds: 10, // First to win 6 rounds wins the battle
    playerWins: 0,
    opponentWins: 0,
    battleStatus: 'active',
  });
  
  const [showPongGame, setShowPongGame] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const { toast } = useToast();

  const user = auth.currentUser;

  useEffect(() => {
    if (isOpen && battleId) {
      initializeBattle();
    }
  }, [isOpen, battleId]);

  const initializeBattle = async () => {
    if (!user) return;

    try {
      const battleDoc = await getDoc(doc(db, 'battles', battleId));
      
      if (battleDoc.exists()) {
        const battleData = battleDoc.data();
        setBattleState(prevState => ({
          ...prevState,
          ...battleData.state,
        }));
      } else {
        // Initialize new battle
        const initialBattleData = {
          battleId,
          participants: [user.uid, opponentId],
          participantNames: [user.displayName || user.email, opponentName],
          state: battleState,
          timestamp: serverTimestamp(),
          status: 'active',
          currentPlayer: user.uid, // Who starts first
        };

        await setDoc(doc(db, 'battles', battleId), initialBattleData);
      }
    } catch (error) {
      console.error('Error initializing battle:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to initialize battle.",
      });
    }
  };

  const startPongRound = () => {
    setShowPongGame(true);
  };

  const handlePongResult = async (playerWon: boolean) => {
    setShowPongGame(false);
    
    const newState = { ...battleState };
    
    if (playerWon) {
      newState.playerWins += 1;
      newState.opponentHp = Math.max(0, newState.opponentHp - 10);
      toast({
        title: "Round Won!",
        description: `You dealt 10 damage to ${opponentName}`,
      });
    } else {
      newState.opponentWins += 1;
      newState.playerHp = Math.max(0, newState.playerHp - 10);
      toast({
        variant: "destructive",
        title: "Round Lost",
        description: `${opponentName} dealt 10 damage to you`,
      });
    }

    newState.currentRound += 1;

    // Check for battle end conditions
    if (newState.playerHp <= 0 || newState.opponentHp <= 0 || 
        newState.playerWins > newState.totalRounds / 2 || 
        newState.opponentWins > newState.totalRounds / 2) {
      
      newState.battleStatus = 'finished';
      newState.winner = newState.playerHp > newState.opponentHp ? user?.uid : opponentId;
      
      await endBattle(newState);
    } else {
      // Continue battle
      setBattleState(newState);
      await updateBattleState(newState);
    }
  };

  const updateBattleState = async (state: BattleState) => {
    try {
      await updateDoc(doc(db, 'battles', battleId), {
        state,
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating battle state:', error);
    }
  };

  const endBattle = async (finalState: BattleState) => {
    if (!user) return;

    try {
      const isWinner = finalState.winner === user.uid;
      
      // Update battle document
      await updateDoc(doc(db, 'battles', battleId), {
        state: finalState,
        status: 'completed',
        completedAt: serverTimestamp(),
        winner: finalState.winner,
      });

      // Update user stats
      const userRef = doc(db, 'users', user.uid);
      const opponentRef = doc(db, 'users', opponentId);

      if (isWinner) {
        await updateDoc(userRef, {
          wins: increment(1),
          lastBattleAt: serverTimestamp(),
        });
        await updateDoc(opponentRef, {
          losses: increment(1),
          lastBattleAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userRef, {
          losses: increment(1),
          lastBattleAt: serverTimestamp(),
        });
        await updateDoc(opponentRef, {
          wins: increment(1),
          lastBattleAt: serverTimestamp(),
        });
      }

      // Record daily battle interaction
      const today = new Date().toISOString().split('T')[0];
      const interactionId = `${user.uid}_${opponentId}_${today}`;
      
      await setDoc(doc(db, 'daily_battles', interactionId), {
        participants: [user.uid, opponentId],
        date: today,
        battleId,
        winner: finalState.winner,
        timestamp: serverTimestamp(),
      });

      setBattleState(finalState);
      
      toast({
        title: isWinner ? "Victory!" : "Defeat",
        description: isWinner 
          ? `You defeated ${opponentName}! Great job!`
          : `${opponentName} defeated you. Better luck next time!`,
      });

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error ending battle:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save battle results.",
      });
    }
  };

  const forfeitBattle = async () => {
    const finalState = { 
      ...battleState, 
      battleStatus: 'finished' as const,
      winner: opponentId 
    };
    await endBattle(finalState);
  };

  if (showPongGame) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Round {battleState.currentRound} - Pong Battle!</DialogTitle>
          </DialogHeader>
          <PongGame onGameEnd={handlePongResult} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Battle Arena
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {battleState.battleStatus === 'finished' ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {battleState.winner === user?.uid ? (
                  <Trophy className="w-16 h-16 text-yellow-500" />
                ) : (
                  <X className="w-16 h-16 text-red-500" />
                )}
              </div>
              <h3 className="text-2xl font-bold">
                {battleState.winner === user?.uid ? 'Victory!' : 'Defeat'}
              </h3>
              <p className="text-gray-600">
                {battleState.winner === user?.uid 
                  ? `You defeated ${opponentName}!`
                  : `${opponentName} defeated you!`
                }
              </p>
            </div>
          ) : (
            <>
              {/* HP Bars */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">You</span>
                    <span className="text-sm text-gray-600">
                      {battleState.playerHp}/{battleState.maxHp} HP
                    </span>
                  </div>
                  <Progress 
                    value={(battleState.playerHp / battleState.maxHp) * 100} 
                    className="h-3"
                  />
                  <div className="flex items-center mt-1">
                    <Heart className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-sm text-gray-600">
                      Rounds Won: {battleState.playerWins}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{opponentName}</span>
                    <span className="text-sm text-gray-600">
                      {battleState.opponentHp}/{battleState.maxHp} HP
                    </span>
                  </div>
                  <Progress 
                    value={(battleState.opponentHp / battleState.maxHp) * 100} 
                    className="h-3"
                  />
                  <div className="flex items-center mt-1">
                    <Heart className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-sm text-gray-600">
                      Rounds Won: {battleState.opponentWins}
                    </span>
                  </div>
                </div>
              </div>

              {/* Round Info */}
              <div className="text-center">
                <p className="text-lg font-semibold">Round {battleState.currentRound}</p>
                <p className="text-sm text-gray-600">
                  First to win {Math.ceil(battleState.totalRounds / 2)} rounds wins!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  onClick={startPongRound}
                  className="w-full"
                  disabled={isWaitingForOpponent}
                >
                  {isWaitingForOpponent ? 'Waiting for opponent...' : 'Start Pong Round'}
                </Button>
                
                <Button 
                  onClick={forfeitBattle}
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700"
                >
                  Forfeit Battle
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}