"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import QRCode from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';
import { QrCode, Camera } from 'lucide-react';

interface QRBattleSystemProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayer: any;
  onBattleStart: (battleId: string, opponentId: string) => void;
}

export function QRBattleSystem({ isOpen, onClose, selectedPlayer, onBattleStart }: QRBattleSystemProps) {
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');
  const [battleCode, setBattleCode] = useState<string>('');
  const [qrValue, setQrValue] = useState<string>('');
  const [scanInput, setScanInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Generate QR code when dialog opens
  useEffect(() => {
    if (isOpen && mode === 'generate') {
      generateBattleCode();
    }
  }, [isOpen, mode]);

  const generateBattleCode = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const battleId = uuidv4();
    const battleData = {
      battleId,
      initiatorId: user.uid,
      initiatorName: user.displayName || user.email,
      targetPlayerId: selectedPlayer?.id || null,
      targetPlayerName: selectedPlayer?.username || null,
      timestamp: serverTimestamp(),
      status: 'waiting',
    };

    try {
      await setDoc(doc(db, 'battle_codes', battleId), battleData);
      setBattleCode(battleId);
      setQrValue(JSON.stringify({
        battleId,
        initiatorId: user.uid,
        initiatorName: user.displayName || user.email,
      }));
    } catch (error) {
      console.error('Error generating battle code:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate battle code.",
      });
    }
  };

  const scanBattleCode = async () => {
    if (!scanInput.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a battle code.",
      });
      return;
    }

    setIsLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Parse the scanned QR code
      let battleData;
      try {
        battleData = JSON.parse(scanInput);
      } catch {
        // If it's not JSON, treat it as a battle ID
        battleData = { battleId: scanInput };
      }

      // Check if this battle code exists
      const battleDoc = await getDoc(doc(db, 'battle_codes', battleData.battleId));
      
      if (!battleDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "This battle code doesn't exist or has expired.",
        });
        setIsLoading(false);
        return;
      }

      const battle = battleDoc.data();
      
      // Check if user is trying to battle themselves
      if (battle.initiatorId === user.uid) {
        toast({
          variant: "destructive",
          title: "Invalid Battle",
          description: "You cannot battle yourself!",
        });
        setIsLoading(false);
        return;
      }

      // Check if users have already battled today
      const hasAlreadyBattled = await checkDailyBattleLimit(user.uid, battle.initiatorId);
      if (hasAlreadyBattled) {
        toast({
          variant: "destructive",
          title: "Daily Limit Reached",
          description: "You have already battled this player today. Try again tomorrow!",
        });
        setIsLoading(false);
        return;
      }

      // Update battle status
      await setDoc(doc(db, 'battle_codes', battleData.battleId), {
        ...battle,
        opponentId: user.uid,
        opponentName: user.displayName || user.email,
        status: 'accepted',
        acceptedAt: serverTimestamp(),
      }, { merge: true });

      toast({
        title: "Battle Accepted!",
        description: `Starting battle with ${battle.initiatorName}`,
      });

      // Start the battle
      onBattleStart(battleData.battleId, battle.initiatorId);
      onClose();

    } catch (error) {
      console.error('Error scanning battle code:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process battle code.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkDailyBattleLimit = async (userId1: string, userId2: string): Promise<boolean> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      // Check if these two users have battled today
      const battlesQuery = query(
        collection(db, 'battles'),
        where('participants', 'array-contains-any', [userId1, userId2])
      );
      
      const battlesSnapshot = await getDocs(battlesQuery);
      
      for (const battleDoc of battlesSnapshot.docs) {
        const battle = battleDoc.data();
        const battleDate = battle.timestamp?.toDate();
        
        if (battleDate && battleDate >= today) {
          // Check if both users were in this battle
          const participants = battle.participants || [];
          if (participants.includes(userId1) && participants.includes(userId2)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking daily battle limit:', error);
      return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Battle Handshake</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Mode selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'generate' ? 'default' : 'outline'}
              onClick={() => setMode('generate')}
              className="flex-1"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Generate Code
            </Button>
            <Button
              variant={mode === 'scan' ? 'default' : 'outline'}
              onClick={() => setMode('scan')}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Scan Code
            </Button>
          </div>

          {mode === 'generate' ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Show this QR code to {selectedPlayer?.username || 'another player'} to start a battle
                </p>
                
                {qrValue && (
                  <div className="flex justify-center p-4 bg-white border rounded-lg">
                    <QRCode value={qrValue} size={200} />
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <p className="text-xs text-gray-600">Battle Code:</p>
                  <p className="font-mono text-sm break-all">{battleCode}</p>
                </div>
              </div>
              
              <Button
                onClick={generateBattleCode}
                variant="outline"
                className="w-full"
              >
                Generate New Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Enter the battle code or scan the QR code from another player
                </p>
                
                <Input
                  placeholder="Enter battle code or paste QR data"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="font-mono"
                />
              </div>
              
              <Button
                onClick={scanBattleCode}
                disabled={isLoading || !scanInput.trim()}
                className="w-full"
              >
                {isLoading ? 'Processing...' : 'Join Battle'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}