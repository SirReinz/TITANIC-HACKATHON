"use client";

import React, { useState } from 'react';
import { SpaceRaceGameWS } from '@/components/games/SpaceRaceGameWS';
import { Button } from '@/components/ui/button';

export default function TestWebSocketPage() {
  const [roomId, setRoomId] = useState('test-room');
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameEvents, setGameEvents] = useState<string[]>([]);

  const addEvent = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setGameEvents(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const handleGameEnd = (winner: 'player1' | 'player2') => {
    addEvent(`🏁 Game ended! Winner: ${winner}`);
  };

  const startTest = () => {
    setIsGameActive(true);
    setGameEvents([]);
    addEvent('🚀 Starting WebSocket multiplayer test');
  };

  const stopTest = () => {
    setIsGameActive(false);
    addEvent('🛑 Stopping test');
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          🚀 Space Race WebSocket Test
        </h1>
        
        <div className="mb-6 text-center">
          <div className="mb-4 flex gap-4 justify-center items-center">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Room ID"
              className="px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded"
              disabled={isGameActive}
            />
            <Button 
              onClick={startTest} 
              disabled={isGameActive}
              className="bg-green-600 hover:bg-green-700"
            >
              Start WebSocket Test
            </Button>
            <Button 
              onClick={stopTest} 
              disabled={!isGameActive}
              variant="destructive"
            >
              Stop Test
            </Button>
          </div>
          
          <div className="text-sm text-gray-400 mb-4">
            💡 Open this page in multiple tabs or browsers to test multiplayer functionality
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold text-blue-400 mb-4">Game Area</h2>
            {isGameActive ? (
              <SpaceRaceGameWS 
                roomId={roomId}
                onGameEnd={handleGameEnd}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Click "Start WebSocket Test" to begin
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold text-green-400 mb-4">Event Log</h2>
            <div className="h-96 overflow-y-auto bg-gray-900 rounded p-3 font-mono text-xs">
              {gameEvents.length === 0 ? (
                <div className="text-gray-500">No events yet...</div>
              ) : (
                gameEvents.map((event, index) => (
                  <div key={index} className="mb-1 text-green-300">
                    {event}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900 rounded-lg p-4">
          <h2 className="text-xl font-bold text-blue-200 mb-2">WebSocket Test Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">Single Browser Testing:</h3>
              <ul className="text-blue-100 space-y-1 text-sm">
                <li>• Open multiple tabs of this page</li>
                <li>• Use the same Room ID in all tabs</li>
                <li>• First tab becomes the host (Player 1)</li>
                <li>• Additional tabs become clients (Player 2)</li>
                <li>• Host can start the game</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">Multi-Device Testing:</h3>
              <ul className="text-blue-100 space-y-1 text-sm">
                <li>• Open page on different devices/browsers</li>
                <li>• Use the same Room ID on all devices</li>
                <li>• Real-time synchronization via WebSocket</li>
                <li>• 60 FPS server-side game loop</li>
                <li>• Collision detection on server</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-800 rounded">
            <h3 className="font-semibold text-blue-200 mb-2">🔧 Server Setup Required:</h3>
            <div className="text-blue-100 text-sm space-y-1">
              <div>1. Install dependencies: <code className="bg-blue-700 px-1 rounded">npm install express ws cors</code></div>
              <div>2. Run WebSocket server: <code className="bg-blue-700 px-1 rounded">node websocket-server.js</code></div>
              <div>3. Server will run on <code className="bg-blue-700 px-1 rounded">ws://localhost:9003</code></div>
            </div>
          </div>
        </div>

        {/* Performance Comparison */}
        <div className="mt-6 bg-green-900 rounded-lg p-4">
          <h2 className="text-xl font-bold text-green-200 mb-2">⚡ Performance Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-100 text-sm">
            <div>
              <h3 className="font-semibold text-green-300 mb-2">Old HTTP Approach:</h3>
              <ul className="space-y-1">
                <li>• PUT/GET requests every 500ms</li>
                <li>• Database read/write on every update</li>
                <li>• 2-6 second response times</li>
                <li>• Limited to 2 FPS sync rate</li>
                <li>• High database load</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-green-300 mb-2">New WebSocket Approach:</h3>
              <ul className="space-y-1">
                <li>• Real-time bidirectional communication</li>
                <li>• In-memory game state (60 FPS)</li>
                <li>• ~1-10ms latency</li>
                <li>• 60 FPS server-side game loop</li>
                <li>• Zero database load during gameplay</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}