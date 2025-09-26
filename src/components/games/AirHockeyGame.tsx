"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface AirHockeyGameProps {
  isHost: boolean;
  onGameStateUpdate: (gameState: AirHockeyGameState) => void;
  onGameEnd: (winner: 'player1' | 'player2') => void;
  gameState?: AirHockeyGameState;
}

export interface AirHockeyGameState {
  puck: {
    x: number;
    y: number;
    speedX: number;
    speedY: number;
  };
  player1: {
    x: number;
    y: number;
    score: number;
  };
  player2: {
    x: number;
    y: number;
    score: number;
  };
  gameStarted: boolean;
  gameOver: boolean;
  winner?: 'player1' | 'player2';
  lastUpdateTime?: number;
}

export function AirHockeyGame({ isHost, onGameStateUpdate, onGameEnd, gameState }: AirHockeyGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const gameStateRef = useRef<AirHockeyGameState>();
  const [localGameState, setLocalGameState] = useState<AirHockeyGameState>({
    puck: { x: 250, y: 325, speedX: 0, speedY: 0 },
    player1: { x: 250, y: 487.5, score: 0 }, // AI/Top player
    player2: { x: 250, y: 162.5, score: 0 }, // Human/Bottom player
    gameStarted: false,
    gameOver: false,
    lastUpdateTime: undefined,
  });

  // Calculate responsive dimensions once and keep them static
  const getStaticDimensions = () => {
    if (typeof window === 'undefined') return { width: 500, height: 650 };
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Mobile responsiveness
    if (screenWidth < 768) {
      return {
        width: Math.min(screenWidth - 40, 400),
        height: Math.min(screenHeight * 0.6, 520)
      };
    }
    
    // Tablet responsiveness  
    if (screenWidth < 1024) {
      return {
        width: Math.min(screenWidth - 80, 450),
        height: Math.min(screenHeight * 0.65, 580)
      };
    }
    
    // Desktop
    return { width: 500, height: 650 };
  };

  // Calculate once and keep static to prevent re-renders
  const [CANVAS_WIDTH] = useState(() => getStaticDimensions().width);
  const [CANVAS_HEIGHT] = useState(() => getStaticDimensions().height);
  const MALLET_RADIUS = Math.max(15, CANVAS_WIDTH * 0.05);
  const PUCK_RADIUS = Math.max(8, CANVAS_WIDTH * 0.03);
  const GOAL_WIDTH = CANVAS_WIDTH * 0.3;
  const GOAL_DEPTH = Math.max(10, CANVAS_HEIGHT * 0.023);
  const FRICTION = 0.995;
  const WINNING_SCORE = 7;

  // Simplified state management - use external gameState only if complete, otherwise use local state
  const currentGameState = (gameState?.player1?.score !== undefined && gameState?.player2?.score !== undefined) 
    ? gameState 
    : localGameState;
  
  // Update ref immediately without useEffect to avoid render cycles
  gameStateRef.current = currentGameState;

  // Update local state when game state is received from server (only if complete and different)
  useEffect(() => {
    if (gameState?.player1?.score !== undefined && gameState?.player2?.score !== undefined && gameState !== localGameState) {
      setLocalGameState(gameState);
    }
  }, [gameState, localGameState]);

  const resetPuck = useCallback((): AirHockeyGameState['puck'] => {
    return {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      speedX: 0,
      speedY: 0,
    };
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  const startGame = useCallback(() => {
    if (!isHost) return;
    
    const newState: AirHockeyGameState = {
      puck: resetPuck(),
      player1: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT * 0.75, score: 0 },
      player2: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT * 0.25, score: 0 },
      gameStarted: true,
      gameOver: false,
      lastUpdateTime: Date.now(),
    };
    
    setLocalGameState(newState);
    onGameStateUpdate(newState);
  }, [isHost, resetPuck, onGameStateUpdate]);

  const updateGame = useCallback(() => {
    const current = gameStateRef.current;
    if (!isHost || !current?.gameStarted || current?.gameOver) return;

    const now = Date.now();
    const newState = { ...current };
    
    // Initialize timing if not set
    if (!newState.lastUpdateTime) {
      newState.lastUpdateTime = now;
      return;
    }
    
    // Calculate delta time in seconds
    const deltaTime = (now - newState.lastUpdateTime) / 1000;
    newState.lastUpdateTime = now;
    
    // Apply friction to puck (per second instead of per frame)
    const frictionPerSecond = Math.pow(FRICTION, 60); // Convert per-frame friction to per-second
    newState.puck.speedX *= Math.pow(frictionPerSecond, deltaTime);
    newState.puck.speedY *= Math.pow(frictionPerSecond, deltaTime);

    // Move puck based on delta time (speeds are now in pixels per second)
    newState.puck.x += newState.puck.speedX * deltaTime;
    newState.puck.y += newState.puck.speedY * deltaTime;

    // Wall collisions
    if (newState.puck.x - PUCK_RADIUS < 0 || newState.puck.x + PUCK_RADIUS > CANVAS_WIDTH) {
      newState.puck.speedX = -newState.puck.speedX;
      newState.puck.x = Math.max(PUCK_RADIUS, Math.min(CANVAS_WIDTH - PUCK_RADIUS, newState.puck.x));
    }

    // Goal detection
    const goalLeft = (CANVAS_WIDTH - GOAL_WIDTH) / 2;
    const goalRight = goalLeft + GOAL_WIDTH;

    // Top goal (Player 2 scores)
    if (newState.puck.y - PUCK_RADIUS < GOAL_DEPTH && 
        newState.puck.x > goalLeft && newState.puck.x < goalRight) {
      newState.player2.score++;
      newState.puck = resetPuck();
    }
    // Bottom goal (Player 1 scores)
    else if (newState.puck.y + PUCK_RADIUS > CANVAS_HEIGHT - GOAL_DEPTH && 
             newState.puck.x > goalLeft && newState.puck.x < goalRight) {
      newState.player1.score++;
      newState.puck = resetPuck();
    }
    // Top wall collision
    else if (newState.puck.y - PUCK_RADIUS < 0) {
      newState.puck.speedY = -newState.puck.speedY;
      newState.puck.y = PUCK_RADIUS;
    }
    // Bottom wall collision
    else if (newState.puck.y + PUCK_RADIUS > CANVAS_HEIGHT) {
      newState.puck.speedY = -newState.puck.speedY;
      newState.puck.y = CANVAS_HEIGHT - PUCK_RADIUS;
    }

    // Mallet-puck collision
    const mallets = [
      { x: newState.player1.x, y: newState.player1.y },
      { x: newState.player2.x, y: newState.player2.y }
    ];

    mallets.forEach(mallet => {
      const dx = newState.puck.x - mallet.x;
      const dy = newState.puck.y - mallet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MALLET_RADIUS + PUCK_RADIUS) {
        const angle = Math.atan2(dy, dx);
        // Force is now in pixels per second - 3x slower: 600/3 = 200 px/s
        const forcePixelsPerSecond = 200;
        newState.puck.speedX += Math.cos(angle) * forcePixelsPerSecond;
        newState.puck.speedY += Math.sin(angle) * forcePixelsPerSecond;

        // Separate puck from mallet
        const separation = MALLET_RADIUS + PUCK_RADIUS - distance;
        newState.puck.x += Math.cos(angle) * separation;
        newState.puck.y += Math.sin(angle) * separation;
      }
    });

    // Check for winner
    if (newState.player1.score >= WINNING_SCORE) {
      newState.gameOver = true;
      newState.winner = 'player1';
      onGameEnd('player1');
    } else if (newState.player2.score >= WINNING_SCORE) {
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
  }, [isHost, resetPuck, onGameStateUpdate, onGameEnd, CANVAS_WIDTH, CANVAS_HEIGHT, PUCK_RADIUS, MALLET_RADIUS, WINNING_SCORE]);

  const lastMovementUpdate = useRef(0);
  const lastGameStateUpdate = useRef(0);
  
  // Handle mouse/touch movement for mallet control
  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    const current = gameStateRef.current;
    if (!current?.gameStarted || current?.gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const pointerX = (clientX - rect.left) * scaleX;
    const pointerY = (clientY - rect.top) * scaleY;

    const newState = { ...current };
    
    // Constrain mallet movement to player's half with goal area access
    if (isHost) {
      // Player 1 (bottom half) - cannot cross center line (mallet center must stay in bottom half)
      newState.player1.x = Math.max(MALLET_RADIUS, Math.min(CANVAS_WIDTH - MALLET_RADIUS, pointerX));
      const minY = CANVAS_HEIGHT / 2; // Center line - no crossing allowed
      newState.player1.y = Math.max(minY, Math.min(CANVAS_HEIGHT - 5, pointerY)); // Allow closer to bottom goal
    } else {
      // Player 2 (top half) - cannot cross center line (mallet center must stay in top half)
      newState.player2.x = Math.max(MALLET_RADIUS, Math.min(CANVAS_WIDTH - MALLET_RADIUS, pointerX));  
      const maxY = CANVAS_HEIGHT / 2; // Center line - no crossing allowed
      newState.player2.y = Math.max(5, Math.min(maxY, pointerY)); // Allow closer to top goal
    }

    setLocalGameState(newState);
    
    // Throttle movement updates to every 500ms to reduce database load
    const now = Date.now();
    if (now - lastMovementUpdate.current > 500) {
      onGameStateUpdate(newState);
      lastMovementUpdate.current = now;
    }
  }, [isHost, onGameStateUpdate, CANVAS_WIDTH, CANVAS_HEIGHT, MALLET_RADIUS]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  }, [handlePointerMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handlePointerMove]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const current = gameStateRef.current;
    if (!canvas || !current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw hockey rink
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.strokeStyle = '#29ABE2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();

    // Draw goals
    const goalLeft = (CANVAS_WIDTH - GOAL_WIDTH) / 2;
    ctx.strokeStyle = '#FF8C00';
    ctx.lineWidth = 4;
    
    // Top goal
    ctx.beginPath();
    ctx.moveTo(goalLeft, 0);
    ctx.lineTo(goalLeft, GOAL_DEPTH);
    ctx.lineTo(goalLeft + GOAL_WIDTH, GOAL_DEPTH);
    ctx.lineTo(goalLeft + GOAL_WIDTH, 0);
    ctx.stroke();

    // Bottom goal
    ctx.beginPath();
    ctx.moveTo(goalLeft, CANVAS_HEIGHT);
    ctx.lineTo(goalLeft, CANVAS_HEIGHT - GOAL_DEPTH);
    ctx.lineTo(goalLeft + GOAL_WIDTH, CANVAS_HEIGHT - GOAL_DEPTH);
    ctx.lineTo(goalLeft + GOAL_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();

    // Draw mallets
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.arc(current.player1.x, current.player1.y, MALLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#29ABE2';
    ctx.beginPath();
    ctx.arc(current.player2.x, current.player2.y, MALLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Draw puck
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(current.puck.x, current.puck.y, PUCK_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Draw game over text
    if (current.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '36px Arial';
      ctx.textAlign = 'center';
      const winnerText = current.winner === 'player1' ? 'Player 1 Wins!' : 'Player 2 Wins!';
      ctx.fillText(winnerText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
  }, []);

  // Simplified game loop to avoid dependency chain issues
  useEffect(() => {
    let animationId: number;
    
    const gameLoop = () => {
      if (gameStateRef.current?.gameStarted && !gameStateRef.current?.gameOver && isHost) {
        updateGame();
      }
      render();
      animationId = requestAnimationFrame(gameLoop);
    };

    if (currentGameState.gameStarted || isHost) {
      animationId = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [currentGameState.gameStarted, isHost]); // Minimal dependencies

  // Only render on client side to avoid hydration issues
  if (typeof window === 'undefined') {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="flex justify-between w-full max-w-lg px-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">Player 1: 0</div>
            <div className="text-sm text-gray-600">Loading...</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">Player 2: 0</div>
            <div className="text-sm text-gray-600">Loading...</div>
          </div>
        </div>
        <div className="w-[500px] h-[650px] border-2 border-gray-300 bg-white flex items-center justify-center">
          <span className="text-gray-600">Loading Air Hockey Game...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-2 md:space-y-4 p-2 md:p-4 max-w-full overflow-hidden">
      <div className="flex justify-between w-full max-w-2xl px-2 md:px-4">
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-orange-500">
            Player 1: {currentGameState.player1?.score ?? 0}
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            {isHost ? 'You' : 'Opponent'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-blue-500">
            Player 2: {currentGameState.player2?.score ?? 0}
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            {!isHost ? 'You' : 'Opponent'}
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-blue-500 bg-white cursor-none max-w-full h-auto touch-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        style={{ maxWidth: '95vw', maxHeight: '60vh' }}
      />

      <div className="text-center space-y-2">
        {!currentGameState.gameStarted && isHost && (
          <Button onClick={startGame} className="px-6 py-2">
            Start Game
          </Button>
        )}
        {!currentGameState.gameStarted && !isHost && (
          <div className="text-gray-600">Waiting for host to start the game...</div>
        )}
        {currentGameState.gameStarted && (
          <div className="text-sm text-gray-600">
            Move your mouse to control your mallet • First to {WINNING_SCORE} wins!
          </div>
        )}
      </div>
    </div>
  );
}