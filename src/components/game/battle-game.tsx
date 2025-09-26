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
}

export const BattleGame: React.FC<BattleGameProps> = ({ isOpen, onClose, battleId, opponentId, opponentName }) => {
  const { toast } = useToast();
  const [battle, setBattle] = useState<any | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [myScore, setMyScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
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
      if (!resp.ok) return null;
      const json = await resp.json();
      return json.battleGame || null;
    } catch (e) {
      return null;
    }
  }, [battleId]);

  // Poll for battle state
  useEffect(() => {
    let mounted = true;
    if (!isOpen || !battleId) return;

    const tick = async () => {
      const latest = await fetchBattle();
      if (!mounted) return;
      if (latest) {
        setBattle(latest);
        setMyScore(latest.player1?.id === uid ? latest.player1?.score || 0 : latest.player2?.score || 0);
        setOpponentScore(latest.player1?.id === uid ? latest.player2?.score || 0 : latest.player1?.score || 0);
        setStatus(latest.status || 'waiting');
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
    const ok = await sendAction('ready', { isPlayer1 });
    if (ok) setStatus('ready');
  }, [battle, isPlayer1, sendAction]);

  // If both ready and not active, issue start (only one player needs to call)
  useEffect(() => {
    if (!battle) return;
    const p1 = !!battle.player1?.ready;
    const p2 = !!battle.player2?.ready;
    if (p1 && p2 && battle.status !== 'active') {
      // start the game
      sendAction('start');
    }
  }, [battle, sendAction]);

  const updateScore = useCallback(async (isMyScore: boolean, newScore: number) => {
    if (!battle) return;
    await sendAction('update_score', { isPlayer1: isPlayer1 === isMyScore ? isPlayer1 : !isPlayer1, score: newScore });
  }, [battle, isPlayer1, sendAction]);

  const completeBattle = useCallback(async (winnerId?: string) => {
    if (!battle) return;
    await sendAction('complete', { winnerId: winnerId || uid });
    onClose();
  }, [battle, sendAction, uid, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Battle</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h4 className="font-semibold">Battle Info</h4>
            <div>Battle ID: <code>{battleId}</code></div>
            <div>Game: {battle?.gameName || '—'}</div>
            <div>Status: <strong>{status}</strong></div>
            <div className="mt-2">You: <code>{uid || 'anonymous'}</code></div>
            <div>Opponent: <code>{opponentName || battle?.player1?.id === uid ? battle?.player2?.name : battle?.player1?.name}</code></div>
            <div className="mt-3 flex gap-2">
              <Button onClick={handleReady} disabled={!uid || status === 'in-progress' || status === 'active'}>Ready</Button>
              <Button onClick={() => updateScore(true, (myScore || 0) + 1)}>Inc My Score</Button>
              <Button onClick={() => updateScore(false, (opponentScore || 0) + 1)}>Inc Opp Score</Button>
              <Button variant="outline" onClick={() => completeBattle(uid ?? undefined)}>Finish</Button>
            </div>
          </div>

          <div className="p-4 border rounded">
            <h4 className="font-semibold">Scores</h4>
            <div className="flex items-center justify-between mt-2">
              <div>
                <div className="text-sm text-gray-500">You</div>
                <div className="text-2xl font-bold">{myScore}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Opponent</div>
                <div className="text-2xl font-bold">{opponentScore}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-500">Game Area (placeholder)</div>
              <div className="h-40 bg-gray-50 rounded border mt-2 flex items-center justify-center">Game UI would render here</div>
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default BattleGame;
