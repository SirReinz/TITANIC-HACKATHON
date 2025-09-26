'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TestResult {
  success: boolean
  message?: string
  database?: string
  collections?: number
  error?: string
  details?: string
}

export default function MongoTestPage() {
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [setupResult, setSetupResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/mongo/test')
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to test connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const setupDatabase = async () => {
    setSetupLoading(true)
    try {
      const response = await fetch('/api/mongo/setup', { method: 'POST' })
      const result = await response.json()
      setSetupResult(result)
    } catch (error) {
      setSetupResult({
        success: false,
        error: 'Failed to setup database',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setSetupLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>🍃 MongoDB Connection Test</CardTitle>
            <CardDescription>
              Test the connection to your MongoDB Atlas cluster
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button 
                onClick={testConnection} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Test MongoDB Connection'}
              </Button>
              
              <Button 
                onClick={setupDatabase} 
                disabled={setupLoading}
                className="w-full"
                variant="outline"
              >
                {setupLoading ? 'Setting up...' : 'Setup Database Indexes'}
              </Button>
            </div>

            {testResult && (
              <Card className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="pt-6">
                  <div className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? '✅ Success!' : '❌ Failed'}
                  </div>
                  
                  {testResult.message && (
                    <p className="mt-2 text-sm text-gray-600">{testResult.message}</p>
                  )}
                  
                  {testResult.database && (
                    <div className="mt-2 text-sm">
                      <strong>Database:</strong> {testResult.database}
                    </div>
                  )}
                  
                  {testResult.collections !== undefined && (
                    <div className="mt-1 text-sm">
                      <strong>Collections:</strong> {testResult.collections}
                    </div>
                  )}
                  
                  {testResult.error && (
                    <div className="mt-2 text-sm text-red-600">
                      <strong>Error:</strong> {testResult.error}
                    </div>
                  )}
                  
                  {testResult.details && (
                    <div className="mt-1 text-sm text-red-500">
                      <strong>Details:</strong> {testResult.details}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {setupResult && (
              <Card className={setupResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="pt-6">
                  <div className={`font-medium ${setupResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {setupResult.success ? '✅ Database Setup Complete!' : '❌ Setup Failed'}
                  </div>
                  
                  {setupResult.message && (
                    <p className="mt-2 text-sm text-gray-600">{setupResult.message}</p>
                  )}
                  
                  {setupResult.results && (
                    <div className="mt-3">
                      <p className="text-sm font-medium">Collection Status:</p>
                      <ul className="mt-1 text-sm space-y-1">
                        {setupResult.results.map((result: any, index: number) => (
                          <li key={index} className={result.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                            {result.collection}: {result.status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {setupResult.error && (
                    <div className="mt-2 text-sm text-red-600">
                      <strong>Error:</strong> {setupResult.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}