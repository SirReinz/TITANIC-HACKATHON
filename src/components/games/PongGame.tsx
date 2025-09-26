"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface PongGameProps {
  // roomId may be empty to request auto-match from server
  roomId?: string;
  // playerId may be omitted; server will assign one
  playerId?: 'player1' | 'player2' | string;
}

export interface PongGameState {
  ball: { x: number; y: number; speedX: number; speedY: number };
  player1: { y: number; score: number };
  player2: { y: number; score: number };
  gameStarted: boolean;
  gameOver: boolean;
  winner?: 'player1' | 'player2';
  lastUpdateTime?: number;
}

export function PongGame({ roomId: initialRoomId = '', playerId: initialPlayerId }: PongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<PongGameState | null>(null);
  // singleplayer mode - no websockets
  const [localGameState, setLocalGameState] = useState<PongGameState>({
    ball: { x: 400, y: 200, speedX: 2.67, speedY: 2.67 },
    player1: { y: 150, score: 0 },
    player2: { y: 150, score: 0 },
    gameStarted: false,
    gameOver: false,
  });
  const [assignedRoomId, setAssignedRoomId] = useState<string | null>(initialRoomId || null);
  const [assignedPlayerId, setAssignedPlayerId] = useState<string | null>(initialPlayerId || 'player1');
  const [saveStatus, setSaveStatus] = useState<string>('idle');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [opponentReady, setOpponentReady] = useState<boolean>(false);

  // mark ready by persisting a ready flag to the DB; server / polling will detect both ready
  const markReady = useCallback(async () => {
    const gameId = assignedRoomId || '';
    const me = assignedPlayerId || initialPlayerId || 'player1';
    try {
      const body: any = { gameId };
      if (me === 'player1') body.player1Ready = true;
      else body.player2Ready = true;
      await fetch('/api/mongo/pong-games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setIsReady(true);
    } catch (e) {
      // ignore
    }
  }, [assignedRoomId, assignedPlayerId, initialPlayerId]);

  // Configuration constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const PADDLE_WIDTH = 10;
  const PADDLE_HEIGHT = 100;
  const BALL_RADIUS = 8;
  const WINNING_SCORE = 5;

  // keep ref in sync
  useEffect(() => {
    gameStateRef.current = localGameState;
  }, [localGameState]);

  // Persistence polling: every 500ms PUT current scores and GET latest authoritative scores
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let mounted = true;
    const gameId = assignedRoomId || `pong_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    setAssignedRoomId(gameId);

    const saveAndLoad = async () => {
      if (!mounted) return;
      try {
        setSaveStatus('saving');
        const body = {
          gameId,
          player1Score: gameStateRef.current?.player1.score ?? 0,
          player2Score: gameStateRef.current?.player2.score ?? 0,
          timestamp: new Date().toISOString(),
        };

        await fetch('/api/mongo/pong-games', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const resp = await fetch(`/api/mongo/pong-games?gameId=${encodeURIComponent(gameId)}`);
        if (resp.ok) {
          const json = await resp.json();
          if (json && mounted) {
            const remoteP1 = typeof json.player1Score === 'number' ? json.player1Score : null;
            const remoteP2 = typeof json.player2Score === 'number' ? json.player2Score : null;
            setLocalGameState((prev) => {
              const next = { ...prev } as PongGameState;
              if (remoteP1 !== null) next.player1.score = remoteP1;
              if (remoteP2 !== null) next.player2.score = remoteP2;
              if (next.player1.score !== next.player2.score && (next.player1.score >= WINNING_SCORE || next.player2.score >= WINNING_SCORE)) {
                next.gameOver = true;
                next.winner = next.player1.score > next.player2.score ? 'player1' : 'player2';
              }
              return next;
            });
            // readiness logic: use local isReady and remote flags to determine opponent and starting
            const remoteP1Ready = !!json.player1Ready;
            const remoteP2Ready = !!json.player2Ready;
            const me = assignedPlayerId || initialPlayerId || 'player1';
            const otherReady = me === 'player1' ? remoteP2Ready : remoteP1Ready;
            setOpponentReady(!!otherReady);
            if (isReady && otherReady && !localGameState.gameStarted) {
              setLocalGameState((prev) => ({ ...prev, gameStarted: true }));
            }
          }
        }
        setSaveStatus('idle');
      } catch (e) {
        setSaveStatus('error');
      }
    };

    const id = setInterval(saveAndLoad, 500);
    saveAndLoad().catch(() => {});

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [assignedRoomId]);

  const resetBall = useCallback((direction: number): PongGameState['ball'] => {
    const timeBasedDirection = typeof window !== 'undefined' ? (Date.now() % 2 === 0 ? 1 : -1) : 1;
    return {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      speedX: 2.67 * direction,
      speedY: 2.67 * timeBasedDirection,
    };
  }, []);

  // singleplayer: starting handled via UI Start button

  // Game physics and authoritative update (host only)
  const updateGame = useCallback(() => {
    const current = gameStateRef.current;
    if (!current) return;
    const effectivePlayerId = assignedPlayerId || initialPlayerId;
    if (effectivePlayerId !== 'player1' || !current.gameStarted || current.gameOver) return;

    const now = Date.now();
    const newState: PongGameState = { ...current } as PongGameState;
    if (!newState.lastUpdateTime) {
      newState.lastUpdateTime = now;
      setLocalGameState(newState);
      return;
    }

    const deltaTime = (now - newState.lastUpdateTime) / 1000;
    newState.lastUpdateTime = now;

    const ballSpeedPixelsPerSecond = 400;
    const speedScale = ballSpeedPixelsPerSecond / 8;

    newState.ball.x += newState.ball.speedX * speedScale * deltaTime;
    newState.ball.y += newState.ball.speedY * speedScale * deltaTime;

    // Wall collision
    if (newState.ball.y + BALL_RADIUS > CANVAS_HEIGHT || newState.ball.y - BALL_RADIUS < 0) {
      newState.ball.speedY = -newState.ball.speedY;
    }

    // Paddles
    const player1Paddle = { x: 10, y: newState.player1.y, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };
    const player2Paddle = { x: CANVAS_WIDTH - 20, y: newState.player2.y, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };

    // Collision with player1 paddle
    if (
      newState.ball.x - BALL_RADIUS < player1Paddle.x + player1Paddle.width &&
      newState.ball.x + BALL_RADIUS > player1Paddle.x &&
      newState.ball.y - BALL_RADIUS < player1Paddle.y + player1Paddle.height &&
      newState.ball.y + BALL_RADIUS > player1Paddle.y
    ) {
      newState.ball.speedX = Math.abs(newState.ball.speedX) * 1.05;
    }

    // Collision with player2 paddle
    if (
      newState.ball.x - BALL_RADIUS < player2Paddle.x + player2Paddle.width &&
      newState.ball.x + BALL_RADIUS > player2Paddle.x &&
      newState.ball.y - BALL_RADIUS < player2Paddle.y + player2Paddle.height &&
      newState.ball.y + BALL_RADIUS > player2Paddle.y
    ) {
      newState.ball.speedX = -Math.abs(newState.ball.speedX) * 1.05;
    }

    // Scoring
    if (newState.ball.x - BALL_RADIUS < 0) {
      newState.player2.score++;
      newState.ball = resetBall(1);
    } else if (newState.ball.x + BALL_RADIUS > CANVAS_WIDTH) {
      newState.player1.score++;
      newState.ball = resetBall(-1);
    }

    // Check winner
    if (newState.player1.score >= WINNING_SCORE) {
      newState.gameOver = true;
      newState.winner = 'player1';
    } else if (newState.player2.score >= WINNING_SCORE) {
      newState.gameOver = true;
      newState.winner = 'player2';
    }

    // Basic AI: if user is player1, AI controls player2; otherwise reverse
    const me = assignedPlayerId || initialPlayerId || 'player1';
    const aiPaddle = me === 'player1' ? newState.player2 : newState.player1;
    const target = newState.ball.y - PADDLE_HEIGHT / 2;
    const maxMove = Math.max(1, 200 * ((deltaTime) || 0));
    if (Math.abs(aiPaddle.y - target) > maxMove) {
      aiPaddle.y += aiPaddle.y < target ? maxMove : -maxMove;
    } else {
      aiPaddle.y = target;
    }

    setLocalGameState(newState);
  }, [assignedPlayerId, resetBall, assignedRoomId, initialPlayerId, initialRoomId]);

  // Pointer handlers
  const handlePointerMove = useCallback(
    (clientY: number) => {
    const current = gameStateRef.current;
    if (!current?.gameStarted || current.gameOver) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pointerY = clientY - rect.top;
      const paddleY = Math.max(0, Math.min(pointerY - PADDLE_HEIGHT / 2, CANVAS_HEIGHT - PADDLE_HEIGHT));
      const newState = { ...current } as PongGameState;
      const effectivePlayerId = assignedPlayerId || initialPlayerId;
      if (effectivePlayerId === 'player1') newState.player1.y = paddleY;
      else newState.player2.y = paddleY;
      setLocalGameState(newState);
      // send paddle move to server so host or server can reconcile
  // local singleplayer: no move broadcasting
    },
    [assignedPlayerId, assignedRoomId, initialPlayerId, initialRoomId]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => handlePointerMove(e.clientY), [handlePointerMove]);
  // We attach a native non-passive touchmove listener so we can call preventDefault()
  // React's synthetic touch handlers may be passive which prevents preventDefault from working.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeTouchMove = (e: TouchEvent) => {
      // allow dragging the paddle without scrolling the page
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientY);
      }
    };

    // add non-passive listener
    canvas.addEventListener('touchmove', handleNativeTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('touchmove', handleNativeTouchMove as EventListener);
    };
  }, [handlePointerMove]);

  // Render loop
  useEffect(() => {
    let raf = 0;
    const render = () => {
      const canvas = canvasRef.current;
      const current = gameStateRef.current;
      if (!canvas || !current) {
        raf = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // clear
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // center dashed line
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.strokeStyle = '#6b7280';
      ctx.stroke();
      ctx.setLineDash([]);

      // paddles
      ctx.fillStyle = '#FF8C00';
      ctx.fillRect(10, current.player1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillStyle = '#29ABE2';
      ctx.fillRect(CANVAS_WIDTH - 20, current.player2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

      // ball
      ctx.beginPath();
      ctx.arc(current.ball.x, current.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();

      if (current.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        const winnerText = current.winner === 'player1' ? 'Player 1 Wins!' : 'Player 2 Wins!';
        ctx.fillText(winnerText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let tickId: number | null = null;
    const tick = () => {
      // always run game update for singleplayer
      updateGame();
      tickId = window.setTimeout(tick, 1000 / 60);
    };
    tick();
    return () => {
      if (tickId) clearTimeout(tickId);
    };
  }, [assignedPlayerId, initialPlayerId, updateGame]);

  // Keep local ref in sync when we receive remote state
  useEffect(() => {
    gameStateRef.current = localGameState;
  }, [localGameState]);

  // SSR guard
  if (typeof window === 'undefined') {
    return <div />;
  }

  return (
    <div className="flex flex-col items-center space-y-2 md:space-y-4 p-2 md:p-4 max-w-full overflow-hidden">
      <div className="flex justify-between w-full max-w-4xl px-2 md:px-4">
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-orange-500">Player 1: {localGameState.player1.score}</div>
    <div className="text-xs md:text-sm text-gray-600">{(assignedPlayerId || initialPlayerId) === 'player1' ? 'You' : 'Opponent'}</div>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-blue-500">Player 2: {localGameState.player2.score}</div>
          <div className="text-xs md:text-sm text-gray-600">{(assignedPlayerId || initialPlayerId) === 'player2' ? 'You' : 'Opponent'}</div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-300 bg-gray-100 cursor-none max-w-full h-auto touch-none"
        onMouseMove={handleMouseMove}
        style={{ maxWidth: '100vw', maxHeight: '50vh' }}
      />

      <div className="text-center space-y-2 px-2">
        {!localGameState.gameStarted && (
          <div className="space-y-2">
            {!isReady ? (
              <Button onClick={markReady} className="px-4 py-2 md:px-6">Ready</Button>
            ) : (
              <div className="text-xs md:text-sm text-gray-600">Waiting for opponent to Ready...</div>
            )}
            <div className="text-xs md:text-sm text-gray-600">Scores saved every 500ms • Save status: {saveStatus}</div>
            {opponentReady && <div className="text-xs md:text-sm text-green-600">Opponent is Ready — starting shortly...</div>}
          </div>
        )}
        {localGameState.gameStarted && (
          <div className="text-xs md:text-sm text-gray-600 text-center">Move your mouse to control your paddle • First to {WINNING_SCORE} wins!</div>
        )}
      </div>
    </div>
  );
}
