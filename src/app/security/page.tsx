'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Shield, Database, Trash2, Eye, RefreshCw } from 'lucide-react'

interface CollectionInfo {
  name: string
  documentCount: number
  samples: any[]
}

interface DatabaseInfo {
  databaseName: string
  collections: CollectionInfo[]
}

export default function SecurityPage() {
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [cleanupResults, setCleanupResults] = useState<any>(null)

  const inspectDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/mongo/inspect')
      const data = await response.json()
      
      if (data.success) {
        setDatabaseInfo(data.database)
      }
    } catch (error) {
      console.error('Error inspecting database:', error)
    } finally {
      setLoading(false)
    }
  }

  const cleanupCollection = async (collectionName: string) => {
    if (!confirm(`Are you sure you want to delete the "${collectionName}" collection? This cannot be undone!`)) {
      return
    }

    try {
      const response = await fetch('/api/mongo/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup',
          collectionName
        })
      })
      
      const result = await response.json()
      setCleanupResults(result)
      
      // Refresh the database info
      await inspectDatabase()
    } catch (error) {
      console.error('Error cleaning up:', error)
    }
  }

  const isAuthorizedCollection = (name: string) => {
    const authorized = ['users', 'locations', 'messages', 'battles', 'battle_codes', 'daily_battles']
    return authorized.includes(name)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-900 mb-2 flex items-center justify-center gap-3">
            <Shield className="w-10 h-10" />
            🚨 Database Security Center
          </h1>
          <p className="text-xl text-red-700">
            Detect and remove unauthorized database access
          </p>
        </div>

        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-red-800">Security Breach Detected!</AlertTitle>
          <AlertDescription className="text-red-700">
            Unauthorized users may have inserted data into your MongoDB database. 
            Use this tool to inspect and clean up your database.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="inspect" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="inspect" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Inspect Database
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspect">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Inspection
                </CardTitle>
                <CardDescription>
                  View all collections and their contents to identify unauthorized data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={inspectDatabase} 
                  disabled={loading}
                  className="mb-6 w-full"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Inspecting...' : 'Inspect Database'}
                </Button>

                {databaseInfo && (
                  <div className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">Database: {databaseInfo.databaseName}</h3>
                      <p className="text-sm text-gray-600">Found {databaseInfo.collections.length} collections</p>
                    </div>

                    {databaseInfo.collections.map((collection, index) => (
                      <Card key={index} className={`${!isAuthorizedCollection(collection.name) ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {collection.name}
                              {isAuthorizedCollection(collection.name) ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">✅ Authorized</Badge>
                              ) : (
                                <Badge variant="destructive">🚨 Suspicious</Badge>
                              )}
                            </CardTitle>
                            <div className="text-sm text-gray-600">
                              {collection.documentCount} documents
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {collection.samples.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Sample documents:</p>
                              {collection.samples.map((sample, sampleIndex) => (
                                <div key={sampleIndex} className="bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto">
                                  <pre>{JSON.stringify(sample, null, 2)}</pre>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No documents found</p>
                          )}
                          
                          {!isAuthorizedCollection(collection.name) && collection.documentCount > 0 && (
                            <Button
                              onClick={() => cleanupCollection(collection.name)}
                              variant="destructive"
                              size="sm"
                              className="mt-3"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete This Collection
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle>🔒 Security Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">1. Change MongoDB Password</h4>
                    <p className="text-sm text-gray-600">
                      Your current password may be compromised. Log into MongoDB Atlas and create a new database user with a strong password.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">2. Restrict IP Access</h4>
                    <p className="text-sm text-gray-600">
                      In MongoDB Atlas, go to Network Access and remove "Allow access from anywhere" (0.0.0.0/0). 
                      Only allow your specific IP addresses.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">3. Enable MongoDB Atlas Data API Security</h4>
                    <p className="text-sm text-gray-600">
                      Use environment variables for credentials and enable API key authentication.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">4. Monitor Database Activity</h4>
                    <p className="text-sm text-gray-600">
                      Enable MongoDB Atlas monitoring and set up alerts for unusual activity.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {cleanupResults && (
                <Card className={cleanupResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <CardHeader>
                    <CardTitle>Cleanup Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                      {JSON.stringify(cleanupResults, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}