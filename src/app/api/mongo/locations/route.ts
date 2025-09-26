import { NextRequest, NextResponse } from 'next/server'
import { getLocations } from '@/lib/mongodb'

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// GET - Fetch nearby players
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('radius') || '1') // Default 1km
    const currentUserId = searchParams.get('currentUserId')
    const uid = searchParams.get('uid') // For fetching single user location

    // If UID is provided, return just that user's location
    if (uid) {
      const locationsCollection = await getLocations()
      const userLocation = await locationsCollection.findOne({ uid })
      
      return NextResponse.json({ 
        success: true, 
        location: userLocation
      })
    }

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required for nearby search' },
        { status: 400 }
      )
    }

    const locationsCollection = await getLocations()
    
    // Get all locations from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const allLocations = await locationsCollection
      .find({ 
        timestamp: { $gte: fiveMinutesAgo },
        ...(currentUserId && { uid: { $ne: currentUserId } })
      })
      .toArray()

    // Filter by distance
    const nearbyPlayers = allLocations
      .map(location => ({
        ...location,
        _id: location._id?.toString(),
        distance: calculateDistance(lat, lng, location.latitude, location.longitude)
      }))
      .filter(location => location.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    return NextResponse.json({ 
      success: true, 
      players: nearbyPlayers,
      total: nearbyPlayers.length
    })
  } catch (error) {
    console.error('Error fetching nearby players:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nearby players' },
      { status: 500 }
    )
  }
}

// POST - Update player location
export async function POST(request: NextRequest) {
  try {
    const { uid, username, latitude, longitude, university, wins, losses, avatar } = await request.json()

    if (!uid || !username || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const locationsCollection = await getLocations()
    
    const locationData = {
      uid,
      username,
      latitude,
      longitude,
      university: university || '',
      wins: wins || 0,
      losses: losses || 0,
      avatar: avatar || '',
      timestamp: new Date(),
    }

    // Use upsert to update or insert
    const result = await locationsCollection.replaceOne(
      { uid },
      locationData,
      { upsert: true }
    )
    
    return NextResponse.json({ 
      success: true, 
      updated: result.modifiedCount > 0,
      inserted: result.upsertedCount > 0
    })
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

// DELETE - Remove user location
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get('uid')

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'UID is required' },
        { status: 400 }
      )
    }

    const locationsCollection = await getLocations()
    const result = await locationsCollection.deleteOne({ uid })
    
    return NextResponse.json({ 
      success: true, 
      deleted: result.deletedCount > 0
    })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}