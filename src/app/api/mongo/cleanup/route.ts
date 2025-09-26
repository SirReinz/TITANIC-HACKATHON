import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const { action, collectionName, query } = await request.json()
    
    if (action !== 'cleanup') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }
    
    const db = await connectToMongoDB()
    
    let result: any = {}
    
    if (collectionName && collectionName !== 'users' && collectionName !== 'locations' && collectionName !== 'messages') {
      // Drop unauthorized collections
      try {
        await db.collection(collectionName).drop()
        result.droppedCollection = collectionName
      } catch (error) {
        result.dropError = `Failed to drop ${collectionName}: ${error}`
      }
    } else if (query) {
      // Delete specific documents matching query
      const collection = db.collection(collectionName)
      const deleteResult = await collection.deleteMany(query)
      result.deletedCount = deleteResult.deletedCount
    } else {
      return NextResponse.json(
        { success: false, error: 'No valid cleanup action specified' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      result
    })
  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cleanup database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}