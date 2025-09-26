"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';

interface BattleGameProps {
  isOpen: boolean;
  onClose: () => void;
  battleId: string;
  opponentId?: string;
  opponentName?: string;
  onStart?: (battleId: string, opponentId?: string) => void;
}

export const BattleGame: React.FC<BattleGameProps> = ({ isOpen, onClose, battleId, opponentId, opponentName, onStart }) => {
  const { toast } = useToast();
  const [battle, setBattle] = useState<any | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [started, setStarted] = useState(false);
  const pollingRef = useRef<number | null>(null);

  const uid = auth.currentUser?.uid || null;

  const isPlayer1 = useMemo(() => {
    if (!battle || !uid) return false;
    return battle.player1?.id === uid;
  }, [battle, uid]);

  const fetchBattle = useCallback(async () => {
    if (!battleId) return null;
    try {
      const resp = await fetch(`/api/mongo/battle-games?battleId=${encodeURIComponent(battleId)}`);
      if (resp.ok) {
        const json = await resp.json();
        return json.battleGame || null;
      }

      // If the battle game does not exist yet (404), try to create it using current user + opponent info
      if (resp.status === 404) {
        try {
          const user = auth.currentUser;
          if (!user) return null;

          // Post a create request. The server will dedupe if the record already exists.
          const body = {
            battleId,
            player1Id: user.uid,
            player1Name: user.displayName || user.email || user.uid,
            player2Id: opponentId || '',
            player2Name: opponentName || ''
          };

          const createResp = await fetch('/api/mongo/battle-games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (createResp.ok) {
            const created = await createResp.json();
            return created.battleGame || null;
          }
        } catch (e) {
          // ignore create errors, fallthrough to return null
          console.warn('Could not auto-create battle-game record:', e);
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }, [battleId, opponentId, opponentName]);

  // Poll for battle state
  useEffect(() => {
    let mounted = true;
    if (!isOpen || !battleId) return;

    const tick = async () => {
      const latest = await fetchBattle();
      if (!mounted) return;
      if (latest) {
        setBattle(latest);
        setStatus(latest.status || 'waiting');
        // If server marked status active and we haven't forwarded start yet, call onStart
        if (!started && latest.status === 'active') {
          setStarted(true);
          if (onStart) onStart(battleId, opponentId || (latest.player1?.id === uid ? latest.player2?.id : latest.player1?.id));
          // close the dialog as parent will transition into game
          onClose();
        }
      }
    };

    tick();
    pollingRef.current = window.setInterval(tick, 500);

    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, [isOpen, battleId, fetchBattle, uid]);

  const sendAction = useCallback(async (action: string, data?: any) => {
    if (!battleId || !uid) return false;
    try {
      const body = { battleId, playerId: uid, action, data };
      const resp = await fetch('/api/mongo/battle-games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        toast({ variant: 'destructive', title: 'Error', description: `Failed to send ${action}` });
        return false;
      }
      return true;
    } catch (e) {
      console.error('sendAction error', e);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to send ${action}` });
      return false;
    }
  }, [battleId, uid, toast]);

  const handleReady = useCallback(async () => {
    if (!battle) return;
    await sendAction('ready', { isPlayer1 });
  }, [battle, isPlayer1, sendAction]);

  const updateScore = useCallback(async (isMyScore: boolean, newScore: number) => {
    if (!battle) return;
    await sendAction('update_score', { isPlayer1: isPlayer1 === isMyScore ? isPlayer1 : !isPlayer1, score: newScore });
  }, [battle, isPlayer1, sendAction]);

  const completeBattle = useCallback(async (winnerId?: string) => {
    if (!battle) return;
    await sendAction('complete', { winnerId: winnerId || uid });
    onClose();
  }, [battle, sendAction, uid, onClose]);

  const myReady = useMemo(() => {
    if (!battle || !uid) return false;
    return isPlayer1 ? battle.player1?.ready : battle.player2?.ready;
  }, [battle, uid, isPlayer1]);

  const opponentReady = useMemo(() => {
    if (!battle || !uid) return false;
    return isPlayer1 ? battle.player2?.ready : battle.player1?.ready;
  }, [battle, uid, isPlayer1]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ready Up</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center">
          {/* Game Display */}
          <div>
            <div className="text-sm text-gray-600 mb-2">Game Selected</div>
            <div className="text-2xl font-bold">{battle?.gameName || battle?.gameId || 'Loading...'}</div>
          </div>

          {/* Ready Status */}
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">You</div>
              <div className={`font-semibold ${myReady ? 'text-green-600' : 'text-red-600'}`}>
                {myReady ? '✓ Ready' : '✗ Not Ready'}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600">Opponent</div>
              <div className={`font-semibold ${opponentReady ? 'text-green-600' : 'text-red-600'}`}>
                {opponentReady ? '✓ Ready' : '✗ Not Ready'}
              </div>
            </div>
          </div>

          {/* Ready Button */}
          <Button 
            onClick={handleReady} 
            className="w-full" 
            disabled={!uid || myReady}
            size="lg"
          >
            {myReady ? 'Ready!' : 'Ready Up'}
          </Button>

          <div className="text-sm text-gray-500">
            Game starts instantly when both players are ready
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default BattleGame;
