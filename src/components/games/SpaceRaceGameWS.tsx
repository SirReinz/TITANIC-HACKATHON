"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface SpaceRaceGameWSProps {
  roomId?: string;
  onGameEnd?: (winner: 'player1' | 'player2') => void;
}

interface Asteroid {
  id: string;
  x: number;
  y: number;
  size: number;
  speed: number;
  type: 'normal' | 'hunter';
}

export interface SpaceRaceGameState {
  player1: {
    x: number;
    y: number;
    score: number;
    alive: boolean;
  };
  player2: {
    x: number;
    y: number;
    score: number;
    alive: boolean;
  };
  asteroids: Asteroid[];
  gameStarted: boolean;
  gameOver: boolean;
  winner?: 'player1' | 'player2';
  gameTime: number;
  startTime?: number;
  lastScoreUpdate?: number;
  lastUpdateTime?: number;
}

export function SpaceRaceGameWS({ roomId = "default", onGameEnd }: SpaceRaceGameWSProps) {
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [gameState, setGameState] = useState<SpaceRaceGameState>({
    player1: { x: 150, y: 340, score: 0, alive: true },
    player2: { x: 450, y: 340, score: 0, alive: true },
    asteroids: [],
    gameStarted: false,
    gameOver: false,
    winner: undefined,
    gameTime: 0,
    startTime: undefined,
    lastScoreUpdate: undefined,
    lastUpdateTime: undefined,
  });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [playerId, setPlayerId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1);

  // Calculate game dimensions
  const getStaticDimensions = () => {
    if (typeof window === 'undefined') {
      return { width: 600, height: 400 };
    }
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    if (screenWidth < 768) {
      return {
        width: Math.min(screenWidth * 0.95, 500),
        height: Math.min(screenHeight * 0.4, 300),
      };
    }
    
    return { width: 600, height: 400 };
  };

  const [GAME_WIDTH] = useState(() => getStaticDimensions().width);
  const [GAME_HEIGHT] = useState(() => getStaticDimensions().height);
  const SHIP_SIZE = Math.max(24, Math.min(GAME_WIDTH, GAME_HEIGHT) * 0.08);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:9003');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log('🔗 Connected to WebSocket server');
      
      // Join room
      const newPlayerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      setPlayerId(newPlayerId);
      
      ws.send(JSON.stringify({
        type: 'joinRoom',
        roomId: roomId,
        playerId: newPlayerId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'joined':
            setIsHost(data.isHost);
            setPlayerNumber(data.isHost ? 1 : 2);
            setGameState(data.gameState);
            console.log(`🎮 Joined as ${data.isHost ? 'Host (Player 1)' : 'Client (Player 2)'}`);
            break;
            
          case 'gameState':
            setGameState(data.gameState);
            break;
            
          case 'gameStarted':
            console.log('🚀 Game started!');
            break;
            
          case 'gameEnd':
            console.log(`🏁 Game ended! Winner: ${data.winner}`);
            onGameEnd?.(data.winner);
            break;
            
          case 'hostTransferred':
            setIsHost(true);
            setPlayerNumber(1);
            console.log('👑 You are now the host');
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('🔌 Disconnected from WebSocket server');
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [roomId, onGameEnd]);

  // Start game (host only)
  const startGame = useCallback(() => {
    if (!isHost || !wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'startGame'
    }));
  }, [isHost]);

  // Handle mouse/touch movement
  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!gameState.gameStarted || gameState.gameOver || !wsRef.current) return;

    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const rect = gameArea.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    // Calculate new position
    const newX = Math.max(0, Math.min(GAME_WIDTH - SHIP_SIZE, pointerX - SHIP_SIZE / 2));
    const newY = Math.max(0, Math.min(GAME_HEIGHT - SHIP_SIZE, pointerY - SHIP_SIZE / 2));

    // Send movement to server
    wsRef.current.send(JSON.stringify({
      type: 'playerMove',
      x: newX,
      y: newY,
      playerNumber: playerNumber
    }));
  }, [gameState.gameStarted, gameState.gameOver, GAME_WIDTH, GAME_HEIGHT, SHIP_SIZE, playerNumber]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  }, [handlePointerMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handlePointerMove]);

  return (
    <div className="flex flex-col items-center space-y-2 md:space-y-4 p-2 md:p-4 max-w-full overflow-hidden">
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500' :
          connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <span className="text-sm text-gray-600">
          {connectionStatus === 'connected' ? 'Connected' : 
           connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          {connectionStatus === 'connected' && ` • ${isHost ? 'Host (Player 1)' : 'Client (Player 2)'} • Room: ${roomId}`}
        </span>
      </div>

      {/* Score Display */}
      <div className="flex justify-between w-full max-w-2xl px-2 md:px-4">
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-blue-400">
            Player 1: {gameState.player1?.score ?? 0}
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            {playerNumber === 1 ? 'You' : 'Opponent'} {gameState.player1.alive === false && '💀'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-red-400">
            Player 2: {gameState.player2?.score ?? 0}
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            {playerNumber === 2 ? 'You' : 'Opponent'} {gameState.player2.alive === false && '💀'}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div
        ref={gameAreaRef}
        className="relative bg-black border-4 border-cyan-400 overflow-hidden cursor-crosshair touch-none select-none"
        style={{ 
          width: GAME_WIDTH, 
          height: GAME_HEIGHT, 
          maxWidth: '95vw', 
          maxHeight: '50vh',
          touchAction: 'none'
        }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* Starfield background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black">
          {typeof window !== 'undefined' && Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 100}%`,
                animationDelay: `${(i * 0.1) % 2}s`,
              }}
            />
          ))}
        </div>

        {/* Player 1 Ship */}
        {gameState.player1.alive && (
          <div
            className="absolute w-10 h-10 bg-blue-500 border-2 border-blue-300 rounded-full"
            style={{
              left: gameState.player1.x || 0,
              top: gameState.player1.y || 0,
              boxShadow: '0 0 15px #60a5fa',
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
              1
            </div>
          </div>
        )}

        {/* Player 2 Ship */}
        {gameState.player2.alive && (
          <div
            className="absolute w-10 h-10 bg-red-500 border-2 border-red-300 rounded-full"
            style={{
              left: gameState.player2.x || 0,
              top: gameState.player2.y || 0,
              boxShadow: '0 0 15px #f87171',
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
              2
            </div>
          </div>
        )}

        {/* Asteroids */}
        {gameState.asteroids.map(asteroid => (
          <div
            key={asteroid.id}
            className={`absolute rounded-full ${
              asteroid.type === 'hunter' 
                ? 'bg-purple-600 border-2 border-purple-400' 
                : 'bg-yellow-600 border-2 border-yellow-400'
            }`}
            style={{
              left: asteroid.x,
              top: asteroid.y,
              width: asteroid.size,
              height: asteroid.size,
              boxShadow: asteroid.type === 'hunter' 
                ? '0 0 15px #a855f7' 
                : '0 0 10px #ca8a04',
            }}
          />
        ))}

        {/* Game Over Overlay */}
        {gameState.gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-2">Game Over!</h2>
              <p className="text-xl">
                {gameState.winner === 'player1' ? 'Player 1 Wins!' : 'Player 2 Wins!'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="text-center space-y-2 px-2">
        {!gameState.gameStarted && isHost && connectionStatus === 'connected' && (
          <Button onClick={startGame} className="px-4 md:px-6 py-2 text-sm md:text-base">
            Start Race
          </Button>
        )}
        {!gameState.gameStarted && !isHost && (
          <div className="text-xs md:text-sm text-gray-600">Waiting for host to start the race...</div>
        )}
        {gameState.gameStarted && !gameState.gameOver && (
          <div className="text-xs md:text-sm text-gray-600 text-center">
            Move your mouse/finger to control your ship • Avoid asteroids • Survive as long as possible!
            <br />
            <span className="text-green-400">⚡ WebSocket-powered real-time multiplayer</span>
          </div>
        )}
        {connectionStatus === 'disconnected' && (
          <div className="text-red-500 text-sm">
            ❌ Connection lost! Please refresh the page to reconnect.
          </div>
        )}
      </div>
    </div>
  );
}