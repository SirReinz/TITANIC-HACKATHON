"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MultiplayerGameContainer } from '@/components/games/MultiplayerGameContainer';

type GameType = 'pong' | 'airhockey' | 'spacerace' | 'barreldodger';

export default function GameTestPage() {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [gameState, setGameState] = useState<any>(null);

  const games = useMemo(() => [
    { id: 'pong' as GameType, name: 'Pong Battle', description: 'Classic paddle game with real-time multiplayer' },
    { id: 'airhockey' as GameType, name: 'Air Hockey', description: 'Fast-paced air hockey with physics' },
    { id: 'spacerace' as GameType, name: 'Space Race', description: 'Dodge asteroids and survive in space' },
    { id: 'barreldodger' as GameType, name: 'Barrel Dodger', description: 'Survive falling barrels and obstacles' },
  ], []);

  const handleTestGame = useCallback((gameType: GameType) => {
    setSelectedGame(gameType);
    setGameState(null); // Reset game state for fresh test
    setIsGameOpen(true);
  }, []);

  const handleGameStateUpdate = useCallback((newGameState: any) => {
    setGameState(newGameState);
    console.log(`Game state updated:`, newGameState);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎮 Games Test Suite - Quick Access
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Test all four React TypeScript games without needing multiple devices
          </p>
          <p className="text-sm text-gray-500 mb-4">
            ✅ All null safety issues fixed • ✅ Real-time multiplayer ready • ✅ Hydration errors resolved
          </p>
          <div className="mb-4 flex gap-3 justify-center">
            <Button 
              onClick={() => window.open('/test-space-race', '_blank')} 
              variant="outline"
              className="bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
            >
              🚀 Space Race Debug Suite
            </Button>
            <Button 
              onClick={() => window.open('/test-websocket', '_blank')} 
              variant="outline"
              className="bg-green-50 border-green-300 text-green-800 hover:bg-green-100"
            >
              ⚡ WebSocket Test (New!)
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200 hover:border-blue-500 transition-colors"
            >
              <h3 className="text-2xl font-bold mb-3">{game.name}</h3>
              <p className="text-gray-600 mb-4">{game.description}</p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => handleTestGame(game.id)}
                  className="w-full"
                  size="lg"
                >
                  🚀 Test {game.name}
                </Button>
                
                <div className="text-xs text-gray-500">
                  Click to test as Player 1 (Host)
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">🔧 Game Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">Technical Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>React TypeScript components</li>
                <li>Real-time game state synchronization</li>
                <li>Canvas-based rendering</li>
                <li>Mouse/touch controls</li>
                <li>Collision detection</li>
                <li>Physics simulation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-600 mb-2">Multiplayer Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Host/client game management</li>
                <li>Game state broadcasting</li>
                <li>Win condition detection</li>
                <li>Score tracking</li>
                <li>Game end notifications</li>
                <li>Spectator support</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Current Game State Display */}
        {gameState && (
          <div className="mt-6 bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Current Game State:</h4>
            <pre className="text-xs overflow-x-auto bg-white p-3 rounded border">
              {JSON.stringify(gameState, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Game Container */}
      <MultiplayerGameContainer
        isOpen={isGameOpen}
        onClose={() => setIsGameOpen(false)}
        isHost={true} // Testing as host
        onGameStateUpdate={handleGameStateUpdate}
        gameState={gameState}
        selectedGame={"pong"}
      />
    </div>
  );
}