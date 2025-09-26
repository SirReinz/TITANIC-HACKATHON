import { NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb'

export async function GET() {
  try {
    const db = await connectToMongoDB()
    
    // Get all collection names
    const collections = await db.listCollections().toArray()
    
    const databaseInfo: {
      databaseName: string
      collections: Array<{
        name: string
        documentCount: number
        samples: any[]
      }>
    } = {
      databaseName: db.databaseName,
      collections: []
    }
    
    // Get document counts and sample data from each collection
    for (const collectionInfo of collections) {
      const collection = db.collection(collectionInfo.name)
      const count = await collection.countDocuments()
      
      // Get a few sample documents to see what's been inserted
      const samples = await collection.find({}).limit(3).toArray()
      
      databaseInfo.collections.push({
        name: collectionInfo.name,
        documentCount: count,
        samples: samples.map(doc => {
          const { _id, ...rest } = doc
          return {
            _id: _id?.toString(),
            ...rest
          }
        })
      })
    }
    
    return NextResponse.json({
      success: true,
      database: databaseInfo
    })
  } catch (error) {
    console.error('Error inspecting database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to inspect database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}