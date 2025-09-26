"use client";

import React, { useState, useRef, useCallback } from 'react';
import { SpaceRaceGame, SpaceRaceGameState } from '@/components/games/SpaceRaceGame';
import { Button } from '@/components/ui/button';

export default function TestSpaceRacePage() {
  const [player1State, setPlayer1State] = useState<SpaceRaceGameState | null>(null);
  const [player2State, setPlayer2State] = useState<SpaceRaceGameState | null>(null);
  const [gameEvents, setGameEvents] = useState<string[]>([]);
  const [isGameActive, setIsGameActive] = useState(false);
  const eventIdRef = useRef(0);

  const addEvent = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const eventId = ++eventIdRef.current;
    setGameEvents(prev => [`[${timestamp}] #${eventId}: ${message}`, ...prev.slice(0, 19)]);
  }, []);

  const handlePlayer1StateUpdate = useCallback((gameState: SpaceRaceGameState) => {
    setPlayer1State(gameState);
    addEvent(`Player 1 (Host) state update: P1 alive=${gameState.player1.alive}, P2 alive=${gameState.player2.alive}, Asteroids=${gameState.asteroids.length}`);
    
    // Log collisions
    if (!gameState.player1.alive && player1State?.player1.alive) {
      addEvent(`🚨 PLAYER 1 DIED! Position: (${gameState.player1.x}, ${gameState.player1.y})`);
    }
    if (!gameState.player2.alive && player1State?.player2.alive) {
      addEvent(`🚨 PLAYER 2 DIED! Position: (${gameState.player2.x}, ${gameState.player2.y})`);
    }
  }, [addEvent, player1State]);

  const handlePlayer2StateUpdate = useCallback((gameState: SpaceRaceGameState) => {
    setPlayer2State(gameState);
    addEvent(`Player 2 state update: P1 alive=${gameState.player1.alive}, P2 alive=${gameState.player2.alive}, Asteroids=${gameState.asteroids.length}`);
  }, [addEvent]);

  const handlePlayer1GameEnd = useCallback((winner: 'player1' | 'player2') => {
    addEvent(`🏁 GAME END (Player 1 perspective): Winner is ${winner}`);
    setIsGameActive(false);
  }, [addEvent]);

  const handlePlayer2GameEnd = useCallback((winner: 'player1' | 'player2') => {
    addEvent(`🏁 GAME END (Player 2 perspective): Winner is ${winner}`);
  }, [addEvent]);

  const resetTest = () => {
    setPlayer1State(null);
    setPlayer2State(null);
    setGameEvents([]);
    setIsGameActive(false);
    eventIdRef.current = 0;
    addEvent("🔄 Test reset - Ready to start new game");
  };

  const startTest = () => {
    setIsGameActive(true);
    addEvent("🚀 Starting multiplayer test simulation");
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Space Race Multiplayer Test
        </h1>
        
        <div className="mb-4 flex gap-4 justify-center">
          <Button onClick={startTest} disabled={isGameActive}>
            Start Test
          </Button>
          <Button onClick={resetTest} variant="destructive">
            Reset Test
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Player 1 (Host) */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold text-blue-400 mb-4">Player 1 (Host)</h2>
            {isGameActive && (
              <SpaceRaceGame
                isHost={true}
                onGameStateUpdate={handlePlayer1StateUpdate}
                onGameEnd={handlePlayer1GameEnd}
                gameState={player2State || undefined}
              />
            )}
            
            {/* Player 1 Debug Info */}
            <div className="mt-4 text-sm text-gray-300">
              <h3 className="font-semibold text-blue-300 mb-2">Player 1 State:</h3>
              {player1State ? (
                <div className="space-y-1">
                  <div>P1: ({Math.round(player1State.player1.x)}, {Math.round(player1State.player1.y)}) - {player1State.player1.alive ? '✅ Alive' : '💀 Dead'} - Score: {player1State.player1.score}</div>
                  <div>P2: ({Math.round(player1State.player2.x)}, {Math.round(player1State.player2.y)}) - {player1State.player2.alive ? '✅ Alive' : '💀 Dead'} - Score: {player1State.player2.score}</div>
                  <div>Asteroids: {player1State.asteroids.length}</div>
                  <div>Game Time: {player1State.gameTime}s</div>
                  <div>Started: {player1State.gameStarted ? 'Yes' : 'No'}, Over: {player1State.gameOver ? 'Yes' : 'No'}</div>
                </div>
              ) : (
                <div>No state data</div>
              )}
            </div>
          </div>

          {/* Player 2 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold text-red-400 mb-4">Player 2</h2>
            {isGameActive && (
              <SpaceRaceGame
                isHost={false}
                onGameStateUpdate={handlePlayer2StateUpdate}
                onGameEnd={handlePlayer2GameEnd}
                gameState={player1State || undefined}
              />
            )}
            
            {/* Player 2 Debug Info */}
            <div className="mt-4 text-sm text-gray-300">
              <h3 className="font-semibold text-red-300 mb-2">Player 2 State:</h3>
              {player2State ? (
                <div className="space-y-1">
                  <div>P1: ({Math.round(player2State.player1.x)}, {Math.round(player2State.player1.y)}) - {player2State.player1.alive ? '✅ Alive' : '💀 Dead'} - Score: {player2State.player1.score}</div>
                  <div>P2: ({Math.round(player2State.player2.x)}, {Math.round(player2State.player2.y)}) - {player2State.player2.alive ? '✅ Alive' : '💀 Dead'} - Score: {player2State.player2.score}</div>
                  <div>Asteroids: {player2State.asteroids.length}</div>
                  <div>Game Time: {player2State.gameTime}s</div>
                  <div>Started: {player2State.gameStarted ? 'Yes' : 'No'}, Over: {player2State.gameOver ? 'Yes' : 'No'}</div>
                </div>
              ) : (
                <div>No state data</div>
              )}
            </div>
          </div>

          {/* Event Log */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold text-green-400 mb-4">Event Log</h2>
            <div className="h-96 overflow-y-auto bg-gray-900 rounded p-3 font-mono text-xs">
              {gameEvents.length === 0 ? (
                <div className="text-gray-500">No events yet...</div>
              ) : (
                gameEvents.map((event, index) => (
                  <div key={index} className="mb-1 text-green-300">
                    {event}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* State Comparison */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">State Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">Player 1's View of Asteroids:</h3>
              <div className="bg-gray-900 rounded p-2 h-32 overflow-y-auto">
                {player1State?.asteroids.map((asteroid, index) => (
                  <div key={asteroid.id} className="text-xs text-gray-300">
                    #{index}: ({Math.round(asteroid.x)}, {Math.round(asteroid.y)}) - Size: {asteroid.size} - Type: {asteroid.type}
                  </div>
                )) || <div className="text-gray-500">No asteroids</div>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-red-300 mb-2">Player 2's View of Asteroids:</h3>
              <div className="bg-gray-900 rounded p-2 h-32 overflow-y-auto">
                {player2State?.asteroids.map((asteroid, index) => (
                  <div key={asteroid.id} className="text-xs text-gray-300">
                    #{index}: ({Math.round(asteroid.x)}, {Math.round(asteroid.y)}) - Size: {asteroid.size} - Type: {asteroid.type}
                  </div>
                )) || <div className="text-gray-500">No asteroids</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900 rounded-lg p-4">
          <h2 className="text-xl font-bold text-blue-200 mb-2">Test Instructions</h2>
          <ul className="text-blue-100 space-y-1 text-sm">
            <li>• Click "Start Test" to begin the simulation</li>
            <li>• Player 1 (Host) controls game logic and asteroid generation</li>
            <li>• Player 2 receives game state from Player 1</li>
            <li>• Move your mouse over each game area to control the respective player</li>
            <li>• Watch the Event Log for collision detection and state sync issues</li>
            <li>• Compare the two views to identify desynchronization problems</li>
            <li>• Look for rapid death/resurrection cycles that indicate bugs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}