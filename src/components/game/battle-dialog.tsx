"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '../ui/button';
import { QrCodePlaceholder } from '../icons';
import { PongGame } from '../games/PongGame';
import { Camera, RefreshCw } from 'lucide-react';

type BattleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type BattleStep = 'confirm' | 'show_qr' | 'scan_qr' | 'in_game' | 'results';

export function BattleDialog({ open, onOpenChange }: BattleDialogProps) {
  const [step, setStep] = useState<BattleStep>('confirm');

  const handleClose = () => {
    onOpenChange(false);
    // Reset to first step after a short delay
    setTimeout(() => setStep('confirm'), 300);
  };
  
  const opponentName = "ClashChloe";

  const renderStep = () => {
    switch (step) {
      case 'confirm':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Confirm Battle</DialogTitle>
              <DialogDescription>
                You are about to battle <span className="font-bold text-foreground">{opponentName}</span>. To confirm, one player must show their code and the other must scan it.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button variant="outline" onClick={() => setStep('show_qr')}>Show My Code</Button>
              <Button onClick={() => setStep('scan_qr')}>
                <Camera className="mr-2 h-4 w-4" />
                Scan Code
              </Button>
            </div>
          </>
        );
      case 'show_qr':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Your Battle Code</DialogTitle>
              <DialogDescription>
                Have {opponentName} scan this code to begin the battle.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center items-center py-4">
              <QrCodePlaceholder className="w-48 h-48" />
            </div>
            <p className="text-center text-sm text-muted-foreground">Waiting for opponent to scan...</p>
            <Button variant="ghost" className="w-full mt-4" onClick={() => setStep('confirm')}>Back</Button>
          </>
        );
       case 'scan_qr':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Scan QR Code</DialogTitle>
              <DialogDescription>
                Point your camera at {opponentName}'s QR code.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center items-center py-4 bg-muted/50 rounded-lg aspect-square">
              <div className="w-64 h-64 border-4 border-dashed border-primary rounded-lg flex items-center justify-center">
                <Camera className="w-16 h-16 text-muted-foreground" />
              </div>
            </div>
             <Button className="w-full mt-4" onClick={() => setStep('in_game')}>Simulate Scan & Start</Button>
            <Button variant="ghost" className="w-full mt-2" onClick={() => setStep('confirm')}>Back</Button>
          </>
        );
      case 'in_game':
        return (
          <PongGame 
            roomId="battle-dialog"
            playerId="player1"
            singlePlayer={true}
            onGameEnd={(winner) => setStep('results')} 
          />
        );
      case 'results':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline text-3xl text-center text-primary">You Won!</DialogTitle>
              <DialogDescription className="text-center">
                A great victory against {opponentName}. Your university's rank has improved!
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
              <p>Wins: +1</p>
              <p>University Points: +10</p>
            </div>
            <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => {
                  setStep('in_game');
                }}><RefreshCw className="mr-2 h-4 w-4" />Rematch (Not Allowed Today)</Button>
                <Button variant="outline" className="w-full" onClick={handleClose}>Close</Button>
            </div>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
