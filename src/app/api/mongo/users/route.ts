import { NextRequest, NextResponse } from 'next/server'
import { getUsers } from '@/lib/mongodb'

// GET - Fetch user by UID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get('uid')

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'UID is required' },
        { status: 400 }
      )
    }

    const usersCollection = await getUsers()
    const user = await usersCollection.findOne({ uid })

    return NextResponse.json({ 
      success: true, 
      user: user || null
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// POST - Create or update user
export async function POST(request: NextRequest) {
  try {
    const { uid, username, email, university, wins, losses, avatar } = await request.json()

    if (!uid || !username) {
      return NextResponse.json(
        { success: false, error: 'UID and username are required' },
        { status: 400 }
      )
    }

    const usersCollection = await getUsers()
    
    const userData = {
      uid,
      username,
      email: email || '',
      university: university || '',
      wins: wins || 0,
      losses: losses || 0,
      avatar: avatar || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Use upsert to update or insert
    const result = await usersCollection.replaceOne(
      { uid },
      userData,
      { upsert: true }
    )
    
    return NextResponse.json({ 
      success: true, 
      user: userData,
      updated: result.modifiedCount > 0,
      inserted: result.upsertedCount > 0
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}