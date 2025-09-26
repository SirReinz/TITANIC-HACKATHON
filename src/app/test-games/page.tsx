"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PongGame } from '@/components/games/PongGame';
import { ArrowLeft, Play, Bot, User } from 'lucide-react';
import Link from 'next/link';

interface Game {
  id: string;
  name: string;
  description: string;
  hasAI: boolean;
  component: React.ComponentType<any>;
}

const games: Game[] = [
  {
    id: 'pong',
    name: 'Pong',
    description: 'Classic paddle game with AI opponent',
    hasAI: true,
    component: PongGame
  }
];

export default function TestGamesPage() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameResult, setGameResult] = useState<string | null>(null);

  const handleGameEnd = (result: any) => {
    console.log('Game ended with result:', result);
    
    // Handle different result formats from different games
    let resultText = '';
    if (typeof result === 'boolean') {
      resultText = result ? 'You Won!' : 'You Lost!';
    } else if (typeof result === 'string') {
      if (result === 'player1') {
        resultText = 'You Won!';
      } else if (result === 'player2') {
        resultText = 'AI Won!';
      } else {
        resultText = `Game Over: ${result}`;
      }
    } else {
      resultText = 'Game Completed!';
    }
    
    setGameResult(resultText);
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      setSelectedGame(null);
      setGameResult(null);
    }, 3000);
  };

  const renderGame = (game: Game) => {
    const GameComponent = game.component;
    
    // Only Pong is available
    if (game.id === 'pong') {
      return <GameComponent singlePlayer={true} onGameEnd={handleGameEnd} />;
    }
    
    return <div>Only Pong is available</div>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Test Games</h1>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {games.map((game) => (
            <Card key={game.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {game.hasAI ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  {game.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{game.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {game.hasAI ? 'AI Opponent' : 'Single Player'}
                  </div>
                  <Button onClick={() => setSelectedGame(game)}>
                    <Play className="w-4 h-4 mr-2" />
                    Play
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Game Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Pong</h4>
                <p className="text-sm text-gray-600">Use mouse or arrow keys to control your paddle. Beat the AI opponent!</p>
              </div>
              <div>
                <h4 className="font-semibold">Air Hockey</h4>
                <p className="text-sm text-gray-600">Click and drag to control your paddle. Score goals against the AI!</p>
              </div>
              <div>
                <h4 className="font-semibold">Barrel Dodger</h4>
                <p className="text-sm text-gray-600">Use arrow keys or WASD to dodge falling barrels. Survive as long as possible!</p>
              </div>
              <div>
                <h4 className="font-semibold">Space Race</h4>
                <p className="text-sm text-gray-600">Navigate through space, avoiding asteroids. How far can you go?</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Game Dialog */}
      {selectedGame && (
        <Dialog open={true} onOpenChange={() => setSelectedGame(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedGame.hasAI ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                Testing: {selectedGame.name}
                {gameResult && (
                  <span className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                    gameResult.includes('Won') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {gameResult}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="p-4">
              {renderGame(selectedGame)}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}