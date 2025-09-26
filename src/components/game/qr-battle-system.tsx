"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { BattleGame } from './battle-game';

interface QRBattleSystemProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayer?: { id: string; username: string } | null;
  onBattleStart: (battleId: string, opponentId: string) => void;
}

export function QRBattleSystem({ isOpen, onClose, selectedPlayer, onBattleStart }: QRBattleSystemProps) {
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');
  const [battleCode, setBattleCode] = useState<string>('');
  const [scanInput, setScanInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [showBattleGame, setShowBattleGame] = useState(false);
  const [gameOpponentId, setGameOpponentId] = useState<string>('');
  const [gameOpponentName, setGameOpponentName] = useState<string>('');
  const { toast } = useToast();

  // Generate 4-letter code when dialog opens
  React.useEffect(() => {
    if (isOpen && mode === 'generate') {
      generateBattleCode();
    }
  }, [isOpen, mode]);

  // Poll for battle acceptance when in generate mode
  React.useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (isOpen && mode === 'generate' && battleCode && !isLoading) {
      setIsWaitingForOpponent(true);
      setPollCount(0);
      
      pollInterval = setInterval(async () => {
        try {
          const currentPollCount = pollCount + 1;
          setPollCount(currentPollCount);
          
          const response = await fetch(`/api/mongo/battle-codes?battleId=${battleCode}`);
          if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.battleCode && result.battleCode.status === 'accepted') {
              // Battle has been accepted!
              setIsWaitingForOpponent(false);
              clearInterval(pollInterval);
              
              toast({
                title: "Battle Started!",
                description: `${result.battleCode.opponentName} joined your battle!`,
              });

              // Start the battle game for the code generator
              console.log('Starting battle game for Player 1 with battleCode:', battleCode);
              setGameOpponentId(result.battleCode.opponentId);
              setGameOpponentName(result.battleCode.opponentName);
              setShowBattleGame(true);
              onClose();
            }
          }
        } catch (error) {
          console.error(`[Poll #${pollCount + 1}] Error polling for battle acceptance:`, error);
        }
      }, 2000); // Poll every 2 seconds
    } else {
      setIsWaitingForOpponent(false);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isOpen, mode, battleCode, isLoading, onBattleStart, onClose, toast]);

  // Clean up when dialog closes (but preserve battleCode if battle game is starting)
  React.useEffect(() => {
    if (!isOpen && !showBattleGame) {
      setIsWaitingForOpponent(false);
      setBattleCode('');
      setScanInput('');
      setIsLoading(false);
      setPollCount(0);
    } else if (!isOpen) {
      // Dialog closed but battle game is starting - only clean up non-essential state
      setIsWaitingForOpponent(false);
      setScanInput('');
      setIsLoading(false);
      setPollCount(0);
    }
  }, [isOpen, showBattleGame]);

  // Generate a random 4-letter code
  const generateRandomCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
  };

  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const generateBattleCode = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const battleCode = generateRandomCode();

    try {
      // Get user's current location for range validation
      const userLocationResponse = await fetch(`/api/mongo/locations?userId=${user.uid}`);
      let userLocation = null;
      
      if (userLocationResponse.ok) {
        const locationData = await userLocationResponse.json();
        if (locationData.success && locationData.location) {
          userLocation = {
            latitude: locationData.location.latitude,
            longitude: locationData.location.longitude
          };
        }
      }

      // Create battle code in MongoDB
      const response = await fetch('/api/mongo/battle-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          battleId: battleCode,
          initiatorId: user.uid,
          initiatorName: user.displayName || user.email,
          location: userLocation,
        }),
      });

      if (response.ok) {
        setBattleCode(battleCode);
      } else {
        throw new Error('Failed to create battle code');
      }
    } catch (error) {
      console.error('Error generating battle code:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate battle code.",
      });
    }
  };

  const processBattleCode = async (codeData: string) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);

    try {
      const battleCode = codeData.trim().toUpperCase();

      // Get the battle code from MongoDB
      const response = await fetch(`/api/mongo/battle-codes?battleId=${battleCode}`);
      
      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "This battle code doesn't exist or has expired.",
        });
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      if (!result.success || !result.battleCode) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "This battle code doesn't exist or has expired.",
        });
        setIsLoading(false);
        return;
      }

      const battle = result.battleCode;
      
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

      // Get current user's location
      const userLocationResponse = await fetch(`/api/mongo/locations?userId=${user.uid}`);
      let userLocation = null;
      
      if (userLocationResponse.ok) {
        const locationData = await userLocationResponse.json();
        if (locationData.success && locationData.location) {
          userLocation = {
            latitude: locationData.location.latitude,
            longitude: locationData.location.longitude
          };
        }
      }

      // Check if users are within battle range (100 meters)
      if (battle.location && userLocation) {
        const distance = calculateDistance(
          battle.location.latitude,
          battle.location.longitude,
          userLocation.latitude,
          userLocation.longitude
        );

        if (distance > 100) { // 100 meter range
          toast({
            variant: "destructive",
            title: "Out of Range",
            description: `You need to be within 100 meters to battle. You are ${Math.round(distance)}m away.`,
          });
          setIsLoading(false);
          return;
        }
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

      // Update battle status to accepted
      const updateResponse = await fetch('/api/mongo/battle-codes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          battleId: battleCode,
          opponentId: user.uid,
          opponentName: user.displayName || user.email,
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
        }),
      });

      if (updateResponse.ok) {
        toast({
          title: "Battle Accepted!",
          description: `Starting battle with ${battle.initiatorName}`,
        });

        // Set the battle code so BattleGame component uses the correct battleId
        console.log('Setting battleCode for Player 2:', battleCode);
        setBattleCode(battleCode);
        
        // Start the battle game for the code enterer
        setGameOpponentId(battle.initiatorId);
        setGameOpponentName(battle.initiatorName);
        setShowBattleGame(true);
        onClose();
      } else {
        throw new Error('Failed to accept battle');
      }

    } catch (error) {
      console.error('Error processing battle code:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process battle code.",
      });
    } finally {
      setIsLoading(false);
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

    await processBattleCode(scanInput);
  };

  const checkDailyBattleLimit = async (userId1: string, userId2: string): Promise<boolean> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      // Check if these two users have battled today using MongoDB
      const response = await fetch(`/api/mongo/battles?participant1=${userId1}&participant2=${userId2}&date=${today.toISOString()}`);
      
      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.hasExistingBattle || false;
    } catch (error) {
      console.error('Error checking daily battle limit:', error);
      return false;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Battle System</DialogTitle>
          </DialogHeader>
        
        <div className="space-y-4">
          {/* Mode selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'generate' ? 'default' : 'outline'}
              onClick={() => setMode('generate')}
              className="flex-1"
            >
              Generate Code
            </Button>
            <Button
              variant={mode === 'scan' ? 'default' : 'outline'}
              onClick={() => setMode('scan')}
              className="flex-1"
            >
              Enter Code
            </Button>
          </div>

          {mode === 'generate' ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Share this 4-letter code with {selectedPlayer?.username || 'another player'} to start a battle
                </p>
                
                <div className="p-8 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-6xl font-bold text-center tracking-widest text-blue-600 font-mono">
                    {battleCode || '----'}
                  </div>
                </div>
                
                {isWaitingForOpponent ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-blue-600 font-medium">
                        Waiting for opponent to join... {pollCount > 0 && `(${pollCount} checks)`}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      The battle will start automatically when someone enters your code
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">
                    Players must be within 100 meters to battle
                  </p>
                )}
              </div>
              
              {isWaitingForOpponent ? (
                <Button
                  onClick={() => {
                    setIsWaitingForOpponent(false);
                    setBattleCode('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Cancel Waiting
                </Button>
              ) : (
                <Button
                  onClick={generateBattleCode}
                  variant="outline"
                  className="w-full"
                >
                  Generate New Code
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Enter the 4-letter battle code from another player
                </p>
                
                <Input
                  placeholder="Enter 4-letter code (e.g. ABCD)"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                  className="font-mono text-center text-2xl tracking-widest"
                  maxLength={4}
                />
                
                <p className="text-xs text-gray-500 mt-2">
                  You must be within 100 meters of the other player
                </p>
              </div>
              
              <Button
                onClick={scanBattleCode}
                disabled={isLoading || scanInput.length !== 4}
                className="w-full"
              >
                {isLoading ? 'Processing...' : 'Join Battle'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <BattleGame
      isOpen={showBattleGame}
      onClose={() => {
        setShowBattleGame(false);
        // Clean up battle code and opponent info when battle game closes
        setBattleCode('');
        setGameOpponentId('');
        setGameOpponentName('');
      }}
      battleId={battleCode}
      opponentId={gameOpponentId}
      opponentName={gameOpponentName}
      onStart={(bid, oppId) => {
        // Forward start event to parent so app can mount the actual game
        onBattleStart(bid, oppId || gameOpponentId);
      }}
    />
    </>
  );
}