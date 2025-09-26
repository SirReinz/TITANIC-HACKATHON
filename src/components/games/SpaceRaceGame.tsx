"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface SpaceRaceGameProps {
  isHost: boolean;
  onGameStateUpdate: (gameState: SpaceRaceGameState) => void;
  onGameEnd: (winner: 'player1' | 'player2') => void;
  gameState?: SpaceRaceGameState;
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

export function SpaceRaceGame({ isHost, onGameStateUpdate, onGameEnd, gameState }: SpaceRaceGameProps) {
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const gameStateRef = useRef<SpaceRaceGameState>({
    player1: { x: 100, y: 350, score: 0, alive: true },
    player2: { x: 400, y: 350, score: 0, alive: true },
    asteroids: [],
    gameStarted: false,
    gameOver: false,
    gameTime: 0,
    startTime: undefined,
    lastScoreUpdate: undefined,
    lastUpdateTime: undefined,
  });
  const [localGameState, setLocalGameState] = useState<SpaceRaceGameState>(gameStateRef.current);

  // Calculate responsive dimensions once and keep them static
  const getStaticDimensions = () => {
    if (typeof window === 'undefined') return { width: 600, height: 400 };
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Mobile responsiveness
    if (screenWidth < 768) {
      return {
        width: Math.min(screenWidth - 40, 500),
        height: Math.min(screenHeight * 0.5, 320)
      };
    }
    
    // Tablet responsiveness  
    if (screenWidth < 1024) {
      return {
        width: Math.min(screenWidth - 80, 550),
        height: Math.min(screenHeight * 0.55, 360)
      };
    }
    
    // Desktop
    return { width: 600, height: 400 };
  };

  // Calculate once and keep static to prevent re-renders
  const [GAME_WIDTH] = useState(() => getStaticDimensions().width);
  const [GAME_HEIGHT] = useState(() => getStaticDimensions().height);
  const SHIP_SIZE = Math.max(24, Math.min(GAME_WIDTH, GAME_HEIGHT) * 0.08);
  const TARGET_SCORE = 1000; // Increased for better testing - takes ~3+ minutes to reach

  // Update both local state and ref when game state is received from server (only if complete)
  useEffect(() => {
    if (gameState?.player1?.score !== undefined && gameState?.player2?.score !== undefined) {
      gameStateRef.current = gameState;
      setLocalGameState(gameState);
    }
  }, [gameState]);

  const createAsteroid = useCallback((): Asteroid => {
    // Use proper random values for truly random asteroid placement
    const now = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 5);
    
    const isHunter = Math.random() < 0.2; // 20% chance for hunter asteroid
    return {
      id: `asteroid_${now}_${randomSuffix}`,
      x: Math.random() * (GAME_WIDTH - 30),
      y: -30,
      size: Math.random() * 20 + 15,
      speed: Math.random() * 2, // Speed in pixels per second: 10-30 px/s (much slower)
      type: isHunter ? 'hunter' : 'normal',
    };
  }, [GAME_WIDTH]);

  const startGame = useCallback(() => {
    if (!isHost) return;
    
    const now = Date.now();
    const newState: SpaceRaceGameState = {
      player1: { x: GAME_WIDTH * 0.25, y: GAME_HEIGHT - 60, score: 0, alive: true },
      player2: { x: GAME_WIDTH * 0.75, y: GAME_HEIGHT - 60, score: 0, alive: true },
      asteroids: [],
      gameStarted: true,
      gameOver: false,
      gameTime: 0,
      startTime: now,
      lastScoreUpdate: now,
      lastUpdateTime: now,
    };
    
    setLocalGameState(newState);
    onGameStateUpdate(newState);
  }, [isHost, onGameStateUpdate, GAME_WIDTH, GAME_HEIGHT]);

  const checkCollision = useCallback((ship: { x: number; y: number }, asteroid: Asteroid): boolean => {
    const shipCenterX = ship.x + SHIP_SIZE / 2;
    const shipCenterY = ship.y + SHIP_SIZE / 2;
    const asteroidCenterX = asteroid.x + asteroid.size / 2;
    const asteroidCenterY = asteroid.y + asteroid.size / 2;

    const distance = Math.sqrt(
      Math.pow(shipCenterX - asteroidCenterX, 2) + Math.pow(shipCenterY - asteroidCenterY, 2)
    );

    // Make collision detection much more precise - reduce collision radius by 40%
    const collisionRadius = (SHIP_SIZE / 2 + asteroid.size / 2) * 0.6;
    const isCollision = distance < collisionRadius;
    
    if (isCollision) {
      console.log(`Collision: ship(${ship.x}, ${ship.y}) center(${shipCenterX}, ${shipCenterY}) vs asteroid(${asteroid.x}, ${asteroid.y}) center(${asteroidCenterX}, ${asteroidCenterY}) size:${asteroid.size} distance:${distance.toFixed(2)} threshold:${collisionRadius.toFixed(2)}`);
    }
    
    return isCollision;
  }, [SHIP_SIZE]);

  const updateGame = useCallback(() => {
    if (!isHost || !gameStateRef.current.gameStarted || gameStateRef.current.gameOver) return;

    const now = Date.now();
    const newState = { ...gameStateRef.current };
    
    // Initialize start time and timing if not set
    if (!newState.startTime) {
      newState.startTime = now;
      newState.lastUpdateTime = now;
      return;
    }
    
    // Calculate delta time for smooth movement
    const deltaTime = (now - (newState.lastUpdateTime || now)) / 1000;
    newState.lastUpdateTime = now;
    
    // Calculate elapsed time in seconds
    const elapsedSeconds = Math.floor((now - newState.startTime) / 1000);
    newState.gameTime = elapsedSeconds;

    // Add new asteroids every 500ms based on elapsed time
    const targetAsteroidCount = Math.floor(elapsedSeconds * 2); // 2 asteroids per second
    while (newState.asteroids.length < targetAsteroidCount && newState.asteroids.length < 15) {
      newState.asteroids.push(createAsteroid());
    }

    // Update asteroids with delta-time based movement
    newState.asteroids = newState.asteroids.filter(asteroid => {
      // Speed is already in pixels per second, use directly with deltaTime
      asteroid.y += asteroid.speed * deltaTime;
      
      // Hunter asteroids track the nearest player
      if (asteroid.type === 'hunter') {
        const player1Distance = Math.sqrt(
          Math.pow(newState.player1.x - asteroid.x, 2) + Math.pow(newState.player1.y - asteroid.y, 2)
        );
        const player2Distance = Math.sqrt(
          Math.pow(newState.player2.x - asteroid.x, 2) + Math.pow(newState.player2.y - asteroid.y, 2)
        );

        const targetPlayer = player1Distance < player2Distance ? newState.player1 : newState.player2;
        const angle = Math.atan2(targetPlayer.y - asteroid.y, targetPlayer.x - asteroid.x);
        // Hunter movement speed - 3x slower: 90/3 = 30 px/s
        const hunterSpeedPixelsPerSecond = 1;
        asteroid.x += Math.cos(angle) * hunterSpeedPixelsPerSecond * deltaTime;
        asteroid.y += Math.sin(angle) * hunterSpeedPixelsPerSecond * deltaTime;
      }

      return asteroid.y < GAME_HEIGHT + 50;
    });

    // Check collisions - only if players have valid positions
    if (newState.player1 && newState.player2 && Array.isArray(newState.asteroids)) {
      newState.asteroids.forEach(asteroid => {
        if (newState.player1.alive && 
            typeof newState.player1.x === 'number' && 
            typeof newState.player1.y === 'number' && 
            checkCollision(newState.player1, asteroid)) {
          console.log(`Player 1 collision detected at (${newState.player1.x}, ${newState.player1.y}) with asteroid at (${asteroid.x}, ${asteroid.y})`);
          newState.player1.alive = false;
        }
        if (newState.player2.alive && 
            typeof newState.player2.x === 'number' && 
            typeof newState.player2.y === 'number' && 
            checkCollision(newState.player2, asteroid)) {
          console.log(`Player 2 collision detected at (${newState.player2.x}, ${newState.player2.y}) with asteroid at (${asteroid.x}, ${asteroid.y})`);
          newState.player2.alive = false;
        }
      });
    }

    // Update scores based on time (1 point per second for alive players)
    if (!newState.lastScoreUpdate) {
      newState.lastScoreUpdate = now; // Initialize score update timer
    } else if (now - newState.lastScoreUpdate >= 1000) { // Update every 1000ms = 1 time per second
      if (newState.player1.alive) {
        newState.player1.score += 1; // 1 point every 1000ms = 1 point per second
      }
      if (newState.player2.alive) {
        newState.player2.score += 1; // 1 point every 1000ms = 1 point per second  
      }
      newState.lastScoreUpdate = now;
    }

    // Check win conditions
    if (!newState.player1.alive && !newState.player2.alive) {
      // Both died - highest score wins
      newState.gameOver = true;
      newState.winner = newState.player1.score > newState.player2.score ? 'player1' : 'player2';
      onGameEnd(newState.winner);
    } else if (!newState.player1.alive) {
      newState.gameOver = true;
      newState.winner = 'player2';
      onGameEnd('player2');
    } else if (!newState.player2.alive) {
      newState.gameOver = true;
      newState.winner = 'player1';
      onGameEnd('player1');
    } else if (newState.player1.score >= TARGET_SCORE) {
      newState.gameOver = true;
      newState.winner = 'player1';
      onGameEnd('player1');
    } else if (newState.player2.score >= TARGET_SCORE) {
      newState.gameOver = true;
      newState.winner = 'player2';
      onGameEnd('player2');
    }

    setLocalGameState(newState);
    
    // Throttle game state updates to server at 2 FPS (500ms) to reduce database load
    const currentTime = Date.now();
    if (currentTime - lastGameStateUpdate.current > 200) {
      onGameStateUpdate(newState);
      lastGameStateUpdate.current = currentTime;
    }
  }, [isHost, createAsteroid, checkCollision, onGameStateUpdate, onGameEnd]);

  const lastMovementUpdate = useRef(0);
  const lastGameStateUpdate = useRef(0);
  
  // Handle mouse/touch movement for ship control
  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!gameStateRef.current.gameStarted || gameStateRef.current.gameOver) return;

    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const rect = gameArea.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    const newState = { ...gameStateRef.current };
    
    if (isHost && newState.player1.alive) {
      newState.player1.x = Math.max(0, Math.min(GAME_WIDTH - SHIP_SIZE, pointerX - SHIP_SIZE / 2));
      newState.player1.y = Math.max(0, Math.min(GAME_HEIGHT - SHIP_SIZE, pointerY - SHIP_SIZE / 2));
    } else if (!isHost && newState.player2.alive) {
      newState.player2.x = Math.max(0, Math.min(GAME_WIDTH - SHIP_SIZE, pointerX - SHIP_SIZE / 2));
      newState.player2.y = Math.max(0, Math.min(GAME_HEIGHT - SHIP_SIZE, pointerY - SHIP_SIZE / 2));
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

  return (
    <div className="flex flex-col items-center space-y-2 md:space-y-4 p-2 md:p-4 max-w-full overflow-hidden">
      <div className="flex justify-between w-full max-w-2xl px-2 md:px-4">
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-blue-400">
            Player 1: {localGameState.player1?.score ?? 0}
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            {isHost ? 'You' : 'Opponent'} {localGameState.player1.alive === false && '💀'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-red-400">
            Player 2: {localGameState.player2?.score ?? 0}
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            {!isHost ? 'You' : 'Opponent'} {localGameState.player2.alive === false && '💀'}
          </div>
        </div>
      </div>

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
                left: `${(i * 37) % 100}%`, // Use deterministic positioning
                top: `${(i * 23) % 100}%`,
                animationDelay: `${(i * 0.1) % 2}s`,
              }}
            />
          ))}
        </div>

        {/* Player 1 Ship */}
        {localGameState.player1.alive && (
          <div
            className="absolute w-10 h-10 bg-blue-500 border-2 border-blue-300 rounded-full"
            style={{
              left: localGameState.player1.x || 0,
              top: localGameState.player1.y || 0,
              boxShadow: '0 0 15px #60a5fa',
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
              1
            </div>
          </div>
        )}

        {/* Player 2 Ship */}
        {localGameState.player2.alive && (
          <div
            className="absolute w-10 h-10 bg-red-500 border-2 border-red-300 rounded-full"
            style={{
              left: localGameState.player2.x || 0,
              top: localGameState.player2.y || 0,
              boxShadow: '0 0 15px #f87171',
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
              2
            </div>
          </div>
        )}

        {/* Asteroids */}
        {localGameState.asteroids.map(asteroid => (
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
        {localGameState.gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-2">Game Over!</h2>
              <p className="text-xl">
                {localGameState.winner === 'player1' ? 'Player 1 Wins!' : 'Player 2 Wins!'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="text-center space-y-2 px-2">
        {!localGameState.gameStarted && isHost && (
          <Button onClick={startGame} className="px-4 md:px-6 py-2 text-sm md:text-base">
            Start Race
          </Button>
        )}
        {!localGameState.gameStarted && !isHost && (
          <div className="text-xs md:text-sm text-gray-600">Waiting for host to start the race...</div>
        )}
        {localGameState.gameStarted && (
          <div className="text-xs md:text-sm text-gray-600 text-center">
            Move your mouse/finger to control your ship • Avoid asteroids • First to {TARGET_SCORE} points wins!
          </div>
        )}
      </div>
    </div>
  );
}