import { NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb'

export async function POST() {
  try {
    const db = await connectToMongoDB()
    
    const results = []
    
    // Users collection indexes
    try {
      const usersCollection = db.collection('users')
      await usersCollection.createIndex({ uid: 1 }, { unique: true })
      await usersCollection.createIndex({ username: 1 })
      results.push({ collection: 'users', status: 'success' })
    } catch (error) {
      results.push({ collection: 'users', status: 'error', error: String(error) })
    }
    
    // Locations collection indexes
    try {
      const locationsCollection = db.collection('locations')
      await locationsCollection.createIndex({ uid: 1 }, { unique: true })
      await locationsCollection.createIndex({ timestamp: 1 })
      results.push({ collection: 'locations', status: 'success' })
    } catch (error) {
      results.push({ collection: 'locations', status: 'error', error: String(error) })
    }
    
    // Messages collection indexes
    try {
      const messagesCollection = db.collection('messages')
      await messagesCollection.createIndex({ conversationId: 1 })
      await messagesCollection.createIndex({ participants: 1 })
      await messagesCollection.createIndex({ timestamp: 1 })
      results.push({ collection: 'messages', status: 'success' })
    } catch (error) {
      results.push({ collection: 'messages', status: 'error', error: String(error) })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database setup completed!',
      results
    })
  } catch (error) {
    console.error('Error setting up database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to set up database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}