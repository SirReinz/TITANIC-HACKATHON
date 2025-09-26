"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

type PongGameProps = {
    opponentName: string;
    onGameEnd: (result: 'win' | 'loss') => void;
};

const MAX_HP = 100;
const DAMAGE_PER_POINT = 25;

export function PongGame({ opponentName, onGameEnd }: PongGameProps) {
    const [playerHp, setPlayerHp] = useState(MAX_HP);
    const [opponentHp, setOpponentHp] = useState(MAX_HP);

    useEffect(() => {
        if (playerHp <= 0) {
            onGameEnd('loss');
        }
        if (opponentHp <= 0) {
            onGameEnd('win');
        }
    }, [playerHp, opponentHp, onGameEnd]);

    const handlePlayerScore = () => {
        setOpponentHp(hp => Math.max(0, hp - DAMAGE_PER_POINT));
    };

    const handleOpponentScore = () => {
        setPlayerHp(hp => Math.max(0, hp - DAMAGE_PER_POINT));
    };

    return (
        <div className="flex flex-col gap-4">
            <DialogHeader>
                <DialogTitle className="font-headline text-2xl text-center">Battle: PONG</DialogTitle>
                <DialogDescription className="text-center">First to 0 HP loses. Good luck!</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
                {/* Opponent HP */}
                <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                        <span className="font-semibold">{opponentName}</span>
                        <span className="text-sm text-muted-foreground">{opponentHp} / {MAX_HP} HP</span>
                    </div>
                    <Progress value={opponentHp} className="h-4" />
                </div>
                {/* Your HP */}
                <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-primary">You</span>
                        <span className="text-sm text-muted-foreground">{playerHp} / {MAX_HP} HP</span>
                    </div>
                    <Progress value={playerHp} className="h-4 [&>div]:bg-primary" />
                </div>
            </div>

            {/* Simplified Pong Visual */}
            <div className="relative w-full h-48 bg-muted rounded-lg flex items-center justify-between p-2">
                <div className="w-2 h-16 bg-primary rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-foreground rounded-full"></div>
                <div className="w-2 h-16 bg-foreground rounded-full"></div>
            </div>
            
            {/* Simulation controls */}
            <div className="text-center text-xs text-muted-foreground">
                (This is a gameplay simulation)
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Button onClick={handlePlayerScore} disabled={playerHp <= 0 || opponentHp <= 0}>Score a Point</Button>
                <Button variant="destructive" onClick={handleOpponentScore} disabled={playerHp <= 0 || opponentHp <= 0}>Opponent Scores</Button>
            </div>
        </div>
    );
}
