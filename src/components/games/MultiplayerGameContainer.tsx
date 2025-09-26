"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PongGame, PongGameState } from './PongGame';

type GameType = 'pong';
type GameState = PongGameState;

interface MultiplayerGameContainerProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  onGameStateUpdate?: (gameState: GameState) => void;
  gameState?: GameState;
  selectedGame?: GameType;
}

// Only Pong is selectable while we're actively working on it
const GAMES = [ { id: 'pong' as GameType, name: 'Pong Battle', description: 'Classic paddle game' } ];

export function MultiplayerGameContainer({ 
  isOpen, 
  onClose, 
  isHost, 
  onGameStateUpdate, 
  gameState, 
  selectedGame 
}: MultiplayerGameContainerProps) {
  // Force currentGame to Pong by default
  const [currentGame, setCurrentGame] = useState<GameType | null>('pong');
  const [gameWinner, setGameWinner] = useState<'player1' | 'player2' | null>(null);
  const [roomIdLocal, setRoomIdLocal] = useState('');
  const [playerIdLocal, setPlayerIdLocal] = useState('');
  const [joined, setJoined] = useState(false);
  const [isHostLocal, setIsHostLocal] = useState(false);

  // Sync selectedGame prop with internal state
  // Ignore external selectedGame while we're focused on Pong development
  useEffect(() => {
    setCurrentGame('pong');
  }, []);

  // Memoize callback handlers to prevent unnecessary re-renders
  // selection disabled: only pong allowed
  const handleGameSelect = useCallback((gameType: GameType) => {
    setCurrentGame('pong');
    setGameWinner(null);
  }, []);

  const handleGameStateUpdate = useCallback((newGameState: GameState) => {
    if (onGameStateUpdate) {
      onGameStateUpdate(newGameState);
    }
  }, [onGameStateUpdate]);

  const handleGameEnd = useCallback((winner: 'player1' | 'player2') => {
    setGameWinner(winner);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setCurrentGame(null);
    setGameWinner(null);
  }, []);

  // Memoize game rendering to prevent unnecessary re-renders
  const renderGame = useMemo(() => {
    if (!currentGame) return null;

    const commonProps = {
      isHost,
      onGameStateUpdate: handleGameStateUpdate,
      onGameEnd: handleGameEnd,
    };

    switch (currentGame) {
      case 'pong':
        // Auto-match: immediately mount Pong and let the server pair clients
        return (
          <PongGame />
        );
      // case 'airhockey':
      //   return (
      //     <AirHockeyGame 
      //       {...commonProps}
      //       gameState={gameState as AirHockeyGameState}
      //     />
      //   );
      // case 'spacerace':
      //   return (
      //     <SpaceRaceGame 
      //       {...commonProps}
      //       gameState={gameState as SpaceRaceGameState}
      //     />
      //   );
      // case 'barreldodger':
      //   return (
      //     <BarrelDodgerGame 
      //       {...commonProps}
      //       gameState={gameState as BarrelDodgerGameState}
      //     />
      //   );
      default:
        return null;
    }
  }, [currentGame, isHost, handleGameStateUpdate, handleGameEnd, gameState]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {currentGame ? GAMES.find(g => g.id === currentGame)?.name : 'Select a Game'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!currentGame && (
            <>
              <div className="text-center text-gray-600 mb-6">
                Pong is the only active game right now. Click Play to auto-match and start.
              </div>
              <div className="flex justify-center">
                <div className="p-6 border-2 border-gray-200 rounded-lg">
                  <h3 className="text-xl font-bold mb-2">Pong Battle</h3>
                  <p className="text-gray-600 mb-4">Classic paddle game — auto-match and ready-up flow</p>
                  <Button className="w-full" onClick={() => handleGameSelect('pong')}>Play Pong</Button>
                </div>
              </div>
            </>
          )}

          {currentGame && (
            <div className="space-y-4">
              {gameWinner && (
                <div className="text-center p-4 bg-green-100 border border-green-300 rounded-lg">
                  <h3 className="text-xl font-bold text-green-800">
                    🎉 {gameWinner === 'player1' ? 'Player 1' : 'Player 2'} Wins!
                  </h3>
                  <p className="text-green-700">
                    {gameWinner === (isHost ? 'player1' : 'player2') ? 'You won!' : 'Your opponent won!'}
                  </p>
                </div>
              )}

              {renderGame}

              <div className="flex justify-center space-x-4 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleBackToMenu}
                  disabled={gameState && (gameState as any).gameStarted && !(gameState as any).gameOver}
                >
                  Back to Menu
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                >
                  Close Games
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}