'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ChatSheet } from '@/components/game/chat-sheet'
import { MongoChatSheet } from '@/components/game/mongo-chat-sheet'
import { Database, Users, MessageCircle, Zap, DollarSign } from 'lucide-react'

export default function ChatComparisonPage() {
  const [firebaseChatOpen, setFirebaseChatOpen] = useState(false)
  const [mongoChatOpen, setMongoChatOpen] = useState(false)
  
  // Mock data for testing
  const mockPlayerFirebase = {
    id: 'test-user-123',
    username: 'TestPlayer',
    university: 'Test University'
  }
  
  const mockPlayerMongo = {
    uid: 'test-user-123',
    username: 'TestPlayer',
    university: 'Test University'
  }
  
  const mockLocation = {
    latitude: 40.7128,
    longitude: -74.0060
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔄 Database Migration: Firebase → MongoDB
          </h1>
          <p className="text-xl text-gray-600">
            Compare your current Firebase chat with the new MongoDB implementation
          </p>
        </div>

        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="comparison">📊 Comparison</TabsTrigger>
            <TabsTrigger value="firebase">🔥 Firebase Chat</TabsTrigger>
            <TabsTrigger value="mongodb">🍃 MongoDB Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Firebase Card */}
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-orange-600" />
                    Firebase (Current)
                  </CardTitle>
                  <CardDescription>Your current chat system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Badge variant="destructive" className="text-xs">⚠️ High Costs</Badge>
                    <p className="text-sm text-gray-600">
                      <strong>Usage:</strong> 458 reads, 106 writes, 33 deletes/month
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Cost:</strong> $3-5/month and growing
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-xs">🔄 Real-time</Badge>
                    <p className="text-sm text-gray-600">
                      Automatic updates but causes excessive reads
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => setFirebaseChatOpen(true)}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    Test Firebase Chat
                  </Button>
                </CardContent>
              </Card>

              {/* MongoDB Card */}
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-green-600" />
                    MongoDB (New)
                  </CardTitle>
                  <CardDescription>Your optimized chat system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">💰 Free Tier</Badge>
                    <p className="text-sm text-gray-600">
                      <strong>Usage:</strong> 512MB storage, 100 connections
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Cost:</strong> $0/month (forever free tier)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">⚡ Manual Refresh</Badge>
                    <p className="text-sm text-gray-600">
                      Manual control = predictable usage
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => setMongoChatOpen(true)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Test MongoDB Chat
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Feature Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>🔍 Feature Comparison</CardTitle>
                <CardDescription>Side-by-side feature analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Feature</th>
                        <th className="text-center p-3 font-medium text-orange-600">Firebase</th>
                        <th className="text-center p-3 font-medium text-green-600">MongoDB</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b">
                        <td className="p-3">💰 Monthly Cost</td>
                        <td className="p-3 text-center text-orange-600">$3-5/month</td>
                        <td className="p-3 text-center text-green-600">$0/month</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">🔄 Real-time Updates</td>
                        <td className="p-3 text-center">✅ Automatic</td>
                        <td className="p-3 text-center">🔘 Manual (Better control)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">📊 Usage Predictability</td>
                        <td className="p-3 text-center text-red-600">❌ Unpredictable</td>
                        <td className="p-3 text-center text-green-600">✅ Fully predictable</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">🌍 Nearby Player Search</td>
                        <td className="p-3 text-center">✅ Manual filtering</td>
                        <td className="p-3 text-center text-green-600">✅ Native geospatial</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">💾 Data Structure</td>
                        <td className="p-3 text-center">✅ Documents</td>
                        <td className="p-3 text-center">✅ Documents</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">🔍 Query Performance</td>
                        <td className="p-3 text-center">✅ Good</td>
                        <td className="p-3 text-center text-green-600">✅ Excellent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Migration Benefits */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Migration Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <h3 className="font-medium text-green-800">Cost Savings</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Save $36-60/year with MongoDB's free tier
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-medium text-blue-800">Better Performance</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Native geospatial queries for nearby players
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <h3 className="font-medium text-purple-800">Predictable Usage</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Manual refresh controls prevent rate limiting
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firebase">
            <Card>
              <CardHeader>
                <CardTitle>🔥 Firebase Chat System (Current)</CardTitle>
                <CardDescription>Your existing chat implementation</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  This is your current Firebase-based chat system. Notice the automatic real-time updates that cause high read counts.
                </p>
                <Button onClick={() => setFirebaseChatOpen(true)} className="w-full">
                  Open Firebase Chat
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mongodb">
            <Card>
              <CardHeader>
                <CardTitle>🍃 MongoDB Chat System (New)</CardTitle>
                <CardDescription>Your optimized MongoDB implementation</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  This is your new MongoDB-based chat system with manual refresh controls and optimized queries.
                </p>
                <Button onClick={() => setMongoChatOpen(true)} className="w-full">
                  Open MongoDB Chat
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Chat Components */}
        <ChatSheet
          open={firebaseChatOpen}
          onOpenChange={setFirebaseChatOpen}
          selectedPlayer={mockPlayerFirebase}
          nearbyPlayers={[]}
        />

        <MongoChatSheet
          open={mongoChatOpen}
          onOpenChange={setMongoChatOpen}
          selectedPlayer={mockPlayerMongo}
          currentLocation={mockLocation}
        />
      </div>
    </div>
  )
}