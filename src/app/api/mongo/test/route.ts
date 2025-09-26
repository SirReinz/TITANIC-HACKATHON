import { NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb'

export async function GET() {
  try {
    const db = await connectToMongoDB()
    
    // Test the connection by getting database stats
    const stats = await db.stats()
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful!',
      database: db.databaseName,
      collections: stats.collections || 0
    })
  } catch (error) {
    console.error('MongoDB test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to MongoDB',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}