"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface BattleRecord {
  battleId: string;
  participant1?: string;
  participant2?: string;
  participant1Ready?: boolean;
  participant2Ready?: boolean;
  state?: any;
  updatedAt?: string;
}

function genId(prefix = 'b') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function SimpleBattleSystem() {
  const [battleIdInput, setBattleIdInput] = useState('');
  const [battle, setBattle] = useState<BattleRecord | null>(null);
  const [myId, setMyId] = useState<string>(() => genId('p'));
  const [status, setStatus] = useState<string>('idle');
  const pollingRef = useRef<number | null>(null);

  const createBattle = useCallback(async () => {
    setStatus('creating');
    const newBattleId = genId('battle');
    const body = { battleId: newBattleId, participant1: myId, participant1Ready: false };
    try {
      await fetch('/api/mongo/battle-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setBattle({ battleId: newBattleId, participant1: myId, participant1Ready: false });
      setBattleIdInput(newBattleId);
      setStatus('created');
    } catch (e) {
      setStatus('error');
    }
  }, [myId]);

  const joinBattle = useCallback(async (id?: string) => {
    const bid = id || battleIdInput;
    if (!bid) return setStatus('enter id');
    setStatus('joining');
    try {
      // fetch existing record
      const resp = await fetch(`/api/mongo/battle-games?battleId=${encodeURIComponent(bid)}`);
      if (!resp.ok) return setStatus('not found');
      const json = await resp.json();
      // if participant2 is empty, attempt to join as participant2
      if (!json.participant2 && json.participant1 !== myId) {
        await fetch('/api/mongo/battle-games', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ battleId: bid, participant2: myId, participant2Ready: false }),
        });
      }
      setBattle({ ...json, participant2: json.participant2 || myId });
      setBattleIdInput(bid);
      setStatus('joined');
    } catch (e) {
      setStatus('error');
    }
  }, [battleIdInput, myId]);

  const markReady = useCallback(async () => {
    if (!battle) return;
    const isP1 = battle.participant1 === myId;
    const body: any = { battleId: battle.battleId };
    if (isP1) body.participant1Ready = true;
    else body.participant2Ready = true;
    try {
      await fetch('/api/mongo/battle-games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setStatus('ready');
    } catch (e) {
      setStatus('error');
    }
  }, [battle, myId]);

  const fetchBattle = useCallback(async (bid: string) => {
    try {
      const resp = await fetch(`/api/mongo/battle-games?battleId=${encodeURIComponent(bid)}`);
      if (!resp.ok) return null;
      const json = await resp.json();
      return json as BattleRecord;
    } catch (e) {
      return null;
    }
  }, []);

  // Polling loop
  useEffect(() => {
    if (!battle?.battleId) return;
    let mounted = true;
    const tick = async () => {
      if (!mounted) return;
      const latest = await fetchBattle(battle.battleId);
      if (latest && mounted) {
        setBattle(latest);
        // start when both ready
        if (latest.participant1Ready && latest.participant2Ready) {
          setStatus('starting');
          // small delay so UI can show
          setTimeout(() => setStatus('in-progress'), 200);
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
  }, [battle?.battleId, fetchBattle]);

  return (
    <div className="p-4 border rounded bg-white max-w-md">
      <h3 className="text-lg font-bold">Simple Battle (Mongo-backed)</h3>
      <div className="mt-2">
        <div className="mb-2">Your player id: <code>{myId}</code></div>
        <label className="block text-sm">Battle ID</label>
        <input className="border p-1 w-full" value={battleIdInput} onChange={(e) => setBattleIdInput(e.target.value)} />
        <div className="flex gap-2 mt-2">
          <Button onClick={() => createBattle()}>Create</Button>
          <Button onClick={() => joinBattle()}>Join</Button>
        </div>
        <div className="mt-3">
          <div>Status: <strong>{status}</strong></div>
          {battle && (
            <div className="mt-2">
              <div>BattleId: <code>{battle.battleId}</code></div>
              <div>Participant1: <code>{battle.participant1}</code> — Ready: {String(!!battle.participant1Ready)}</div>
              <div>Participant2: <code>{battle.participant2}</code> — Ready: {String(!!battle.participant2Ready)}</div>
              {!status.startsWith('in-progress') && battle.participant1 && battle.participant2 && (
                <div className="mt-2">
                  <Button onClick={markReady}>Ready</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
