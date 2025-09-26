"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface BarrelDodgerGameProps {
  isHost: boolean;
  onGameStateUpdate: (gameState: BarrelDodgerGameState) => void;
  onGameEnd: (winner: 'player1' | 'player2') => void;
  gameState?: BarrelDodgerGameState;
}

interface Barrel {
  id: string;
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}

export interface BarrelDodgerGameState {
  player1: {
    x: number;
    y: number;
    score: number;
    alive: boolean;
    barrelsToSurvive: number;
    barrelsSurvived: number;
  };
  player2: {
    x: number;
    y: number;
    score: number;
    alive: boolean;
    barrelsToSurvive: number;
    barrelsSurvived: number;
  };
  barrels: Barrel[];
  gameStarted: boolean;
  gameOver: boolean;
  winner?: 'player1' | 'player2';
  round: number;
  lastUpdateTime?: number;
  lastBarrelSpawn?: number;
}

export function BarrelDodgerGame({ isHost, onGameStateUpdate, onGameEnd, gameState }: BarrelDodgerGameProps) {
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [barrelCount, setBarrelCount] = useState(15);
  const gameStateRef = useRef<BarrelDodgerGameState>({
    player1: { x: 100, y: 200, score: 0, alive: true, barrelsToSurvive: 15, barrelsSurvived: 0 },
    player2: { x: 400, y: 200, score: 0, alive: true, barrelsToSurvive: 15, barrelsSurvived: 0 },
    barrels: [],
    gameStarted: false,
    gameOver: false,
    round: 0,
    lastUpdateTime: undefined,
    lastBarrelSpawn: undefined,
  });
  const [localGameState, setLocalGameState] = useState<BarrelDodgerGameState>(gameStateRef.current);

  // Calculate responsive dimensions once and keep them static
  const getStaticDimensions = () => {
    if (typeof window === 'undefined') return { width: 600, height: 300 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(600, vw * 0.9);
    const height = Math.min(300, vh * 0.4, width * 0.5);
    return { width, height };
  };

  // Calculate once and keep static to prevent re-renders
  const [GAME_WIDTH] = useState(() => getStaticDimensions().width);
  const [GAME_HEIGHT] = useState(() => getStaticDimensions().height);
  const PLAYER_SIZE = Math.max(20, Math.min(30, GAME_WIDTH * 0.05));

  // Update both local state and ref when game state is received from server (only if complete)
  useEffect(() => {
    if (gameState?.player1?.score !== undefined && gameState?.player2?.score !== undefined) {
      gameStateRef.current = gameState;
      setLocalGameState(gameState);
    }
  }, [gameState]);

  // Keep ref in sync with local state changes
  useEffect(() => {
    gameStateRef.current = localGameState;
  }, [localGameState]);

  const createBarrel = useCallback((): Barrel => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
    
    // Use proper random values for truly random barrel placement
    const now = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 8);
    
    return {
      id: `barrel_${now}_${randomSuffix}`,
      x: Math.random() * (GAME_WIDTH - 40),
      y: -40,
      size: Math.random() * 20 + 25,
      speed: Math.random() * 20 + 27, // 3x slower: 27-47 px/s (80-140 divided by 3)
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }, [GAME_WIDTH]);

  const startGame = useCallback(() => {
    if (!isHost) return;
    
    const newState: BarrelDodgerGameState = {
      player1: { 
        x: GAME_WIDTH * 0.25, 
        y: GAME_HEIGHT / 2, 
        score: 0, 
        alive: true, 
        barrelsToSurvive: barrelCount,
        barrelsSurvived: 0 
      },
      player2: { 
        x: GAME_WIDTH * 0.75, 
        y: GAME_HEIGHT / 2, 
        score: 0, 
        alive: true, 
        barrelsToSurvive: barrelCount,
        barrelsSurvived: 0 
      },
      barrels: [],
      gameStarted: true,
      gameOver: false,
      round: 1,
      lastUpdateTime: Date.now(),
      lastBarrelSpawn: Date.now(),
    };
    
    setLocalGameState(newState);
    onGameStateUpdate(newState);
  }, [isHost, barrelCount, onGameStateUpdate, GAME_WIDTH, GAME_HEIGHT]);

  const checkCollision = useCallback((player: { x: number; y: number }, barrel: Barrel): boolean => {
    const playerCenterX = player.x + PLAYER_SIZE / 2;
    const playerCenterY = player.y + PLAYER_SIZE / 2;
    const barrelCenterX = barrel.x + barrel.size / 2;
    const barrelCenterY = barrel.y + barrel.size / 2;

    const distance = Math.sqrt(
      Math.pow(playerCenterX - barrelCenterX, 2) + Math.pow(playerCenterY - barrelCenterY, 2)
    );

    return distance < (PLAYER_SIZE / 2 + barrel.size / 2);
  }, [PLAYER_SIZE]);

  const updateGame = useCallback(() => {
    if (!isHost || !gameStateRef.current.gameStarted || gameStateRef.current.gameOver) return;

    const now = Date.now();
    const newState = { ...gameStateRef.current };
    
    // Initialize timing if not set
    if (!newState.lastUpdateTime) {
      newState.lastUpdateTime = now;
      return;
    }
    
    // Calculate delta time in seconds
    const deltaTime = (now - newState.lastUpdateTime) / 1000;
    newState.lastUpdateTime = now;

    // Add new barrels periodically (every 500ms)
    if (!newState.lastBarrelSpawn) {
      newState.lastBarrelSpawn = now;
    }
    
    if (now - newState.lastBarrelSpawn >= 500 && newState.barrels.length < 12) {
      newState.barrels.push(createBarrel());
      newState.lastBarrelSpawn = now;
    }

    // Update barrels with delta time (speeds are already in pixels per second)
    let barrelsRemoved = 0;
    newState.barrels = newState.barrels.filter(barrel => {
      // Speed is already in pixels per second, use directly with deltaTime
      barrel.y += barrel.speed * deltaTime;
      
      if (barrel.y > GAME_HEIGHT + 50) {
        barrelsRemoved++;
        return false;
      }
      return true;
    });

    // Update barrels survived count
    if (barrelsRemoved > 0) {
      if (newState.player1.alive) {
        newState.player1.barrelsSurvived += barrelsRemoved;
        newState.player1.score += barrelsRemoved * 10;
      }
      if (newState.player2.alive) {
        newState.player2.barrelsSurvived += barrelsRemoved;
        newState.player2.score += barrelsRemoved * 10;
      }
    }

    // Check collisions
    newState.barrels.forEach(barrel => {
      if (newState.player1.alive && checkCollision(newState.player1, barrel)) {
        newState.player1.alive = false;
      }
      if (newState.player2.alive && checkCollision(newState.player2, barrel)) {
        newState.player2.alive = false;
      }
    });

    // Check win conditions
    if (!newState.player1.alive && !newState.player2.alive) {
      // Both died - highest score wins, or if equal, who survived more barrels
      newState.gameOver = true;
      if (newState.player1.score === newState.player2.score) {
        newState.winner = newState.player1.barrelsSurvived > newState.player2.barrelsSurvived ? 'player1' : 'player2';
      } else {
        newState.winner = newState.player1.score > newState.player2.score ? 'player1' : 'player2';
      }
      onGameEnd(newState.winner);
    } else if (!newState.player1.alive) {
      newState.gameOver = true;
      newState.winner = 'player2';
      onGameEnd('player2');
    } else if (!newState.player2.alive) {
      newState.gameOver = true;
      newState.winner = 'player1';
      onGameEnd('player1');
    } else if (newState.player1.barrelsSurvived >= newState.player1.barrelsToSurvive) {
      newState.gameOver = true;
      newState.winner = 'player1';
      onGameEnd('player1');
    } else if (newState.player2.barrelsSurvived >= newState.player2.barrelsToSurvive) {
      newState.gameOver = true;
      newState.winner = 'player2';
      onGameEnd('player2');
    }

    setLocalGameState(newState);
    
    // Throttle game state updates to server at 2 FPS (500ms) to reduce database load
    const currentTime = Date.now();
    if (currentTime - lastGameStateUpdate.current > 500) {
      onGameStateUpdate(newState);
      lastGameStateUpdate.current = currentTime;
    }
  }, [isHost, createBarrel, checkCollision, onGameStateUpdate, onGameEnd]);

  const lastMovementUpdate = useRef(0);
  const lastGameStateUpdate = useRef(0);
  
  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!gameStateRef.current.gameStarted || gameStateRef.current.gameOver) return;

    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const rect = gameArea.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    const newState = { ...gameStateRef.current };
    
    if (isHost && newState.player1.alive) {
      newState.player1.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, pointerX - PLAYER_SIZE / 2));
      newState.player1.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, pointerY - PLAYER_SIZE / 2));
    } else if (!isHost && newState.player2.alive) {
      newState.player2.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, pointerX - PLAYER_SIZE / 2));
      newState.player2.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, pointerY - PLAYER_SIZE / 2));
    }

    setLocalGameState(newState);
    
    // Throttle movement updates to every 500ms to reduce database load
    const now = Date.now();
    if (now - lastMovementUpdate.current > 500) {
      onGameStateUpdate(newState);
      lastMovementUpdate.current = now;
    }
  }, [isHost, onGameStateUpdate]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  }, [handlePointerMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handlePointerMove]);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      updateGame();
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    if (localGameState.gameStarted && !localGameState.gameOver) {
      gameLoop();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [updateGame, localGameState.gameStarted, localGameState.gameOver]);

  // Only render on client side to avoid hydration issues
  if (typeof window === 'undefined') {
    return (
      <div className="flex flex-col items-center space-y-2 md:space-y-4 p-2 md:p-4 max-w-full overflow-hidden">
        <div className="flex justify-between w-full max-w-2xl px-2 md:px-4">
          <div className="text-center">
            <div className="text-lg md:text-2xl font-bold text-yellow-400">Player 1: 0</div>
            <div className="text-xs md:text-sm text-gray-600">Loading...</div>
          </div>
          <div className="text-center">
            <div className="text-lg md:text-2xl font-bold text-green-400">Player 2: 0</div>
            <div className="text-xs md:text-sm text-gray-600">Loading...</div>
          </div>
        </div>
        <div className="border-4 border-yellow-400 bg-blue-900 flex items-center justify-center w-full max-w-[600px] h-[300px] max-h-[50vh]">
          <span className="text-white text-sm md:text-base">Loading Barrel Dodger Game...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-2 md:space-y-4 p-2 md:p-4 max-w-full overflow-hidden">
      <div className="flex justify-between w-full max-w-2xl px-2 md:px-4">
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-yellow-400">
            Player 1: {localGameState.player1?.score ?? 0}
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            {isHost ? 'You' : 'Opponent'} • Survived: {localGameState.player1.barrelsSurvived}/{localGameState.player1.barrelsToSurvive}
            {localGameState?.player1?.alive === false && ' 💀'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-purple-400">
            Player 2: {localGameState.player2?.score ?? 0}
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            {!isHost ? 'You' : 'Opponent'} • Survived: {localGameState.player2.barrelsSurvived}/{localGameState.player2.barrelsToSurvive}
            {localGameState?.player2?.alive === false && ' 💀'}
          </div>
        </div>
      </div>

      {/* Barrel count setting (only shown to host before game starts) */}
      {!localGameState.gameStarted && isHost && (
        <div className="flex items-center space-x-2 md:space-x-4 px-2">
          <label className="text-xs md:text-sm font-medium">Barrels to survive:</label>
          <input
            type="number"
            value={barrelCount}
            onChange={(e) => setBarrelCount(Math.max(5, Math.min(50, parseInt(e.target.value) || 15)))}
            className="w-12 md:w-16 px-1 md:px-2 py-1 border rounded text-center text-xs md:text-sm"
            min="5"
            max="50"
          />
        </div>
      )}

      <div
        ref={gameAreaRef}
        className="relative bg-blue-900 border-4 border-yellow-400 overflow-hidden cursor-crosshair touch-none"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT, maxWidth: '95vw', maxHeight: '50vh' }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* Player 1 */}
        {localGameState.player1.alive && (
          <div
            className="absolute bg-red-500 rounded-full border-2 border-yellow-300 flex items-center justify-center"
            style={{
              left: localGameState.player1.x,
              top: localGameState.player1.y,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
            }}
          >
            <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
          </div>
        )}

        {/* Player 2 */}
        {localGameState.player2.alive && (
          <div
            className="absolute bg-purple-500 rounded-full border-2 border-yellow-300 flex items-center justify-center"
            style={{
              left: localGameState.player2.x,
              top: localGameState.player2.y,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
            }}
          >
            <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
          </div>
        )}

        {/* Barrels */}
        {localGameState.barrels.map(barrel => (
          <div
            key={barrel.id}
            className="absolute rounded-lg border-2 border-black shadow-lg"
            style={{
              left: barrel.x,
              top: barrel.y,
              width: barrel.size,
              height: barrel.size,
              backgroundColor: barrel.color,
            }}
          />
        ))}

        {/* Game Over Overlay */}
        {localGameState.gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h2 className="text-2xl md:text-4xl font-bold mb-2">Game Over!</h2>
              <p className="text-lg md:text-xl">
                {localGameState.winner === 'player1' ? 'Player 1 Wins!' : 'Player 2 Wins!'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="text-center space-y-2 px-2">
        {!localGameState.gameStarted && isHost && (
          <Button onClick={startGame} className="px-4 md:px-6 py-2 text-sm md:text-base">
            Start Game
          </Button>
        )}
        {!localGameState?.gameStarted && !isHost && (
          <div className="text-xs md:text-sm text-gray-600">Waiting for host to start the game...</div>
        )}
        {localGameState?.gameStarted && (
          <div className="text-xs md:text-sm text-gray-600 text-center">
            Move your mouse/finger to dodge the falling barrels!
          </div>
        )}
      </div>
    </div>
  );
}