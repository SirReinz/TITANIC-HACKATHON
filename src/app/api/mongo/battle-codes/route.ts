import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoDB } from '@/lib/mongodb';

// GET /api/mongo/battle-codes - Get battle code by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const battleId = searchParams.get('battleId');

    if (!battleId) {
      return NextResponse.json(
        { success: false, error: 'Battle ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();
    
    // Find the battle code
    const battleCode = await db.collection('battle_codes').findOne({ 
      battleId: battleId,
      // Only return active battle codes that haven't expired (older than 5 minutes)
      createdAt: { 
        $gte: new Date(Date.now() - 5 * 60 * 1000) 
      }
    });

    if (!battleCode) {
      return NextResponse.json(
        { success: false, error: 'Battle code not found or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      battleCode: battleCode
    });

  } catch (error) {
    console.error('Error fetching battle code:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/mongo/battle-codes - Create new battle code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { battleId, initiatorId, initiatorName, location } = body;

    if (!battleId || !initiatorId || !initiatorName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();

    // Clean up expired battle codes first
    await db.collection('battle_codes').deleteMany({
      createdAt: { 
        $lt: new Date(Date.now() - 5 * 60 * 1000) 
      }
    });

    // Create new battle code
    const battleCode = {
      battleId,
      initiatorId,
      initiatorName,
      location: location || null,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      opponentId: null,
      opponentName: null,
      acceptedAt: null
    };

    const result = await db.collection('battle_codes').insertOne(battleCode);

    return NextResponse.json({
      success: true,
      battleCode: {
        ...battleCode,
        _id: result.insertedId
      }
    });

  } catch (error) {
    console.error('Error creating battle code:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/mongo/battle-codes - Update battle code (accept battle)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { battleId, opponentId, opponentName, status, acceptedAt } = body;

    if (!battleId || !opponentId || !opponentName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();

    // Update the battle code with opponent info
    const result = await db.collection('battle_codes').updateOne(
      { 
        battleId: battleId,
        status: 'pending' // Only update pending battles
      },
      {
        $set: {
          opponentId,
          opponentName,
          status: status || 'accepted',
          acceptedAt: acceptedAt ? new Date(acceptedAt) : new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Battle code not found or already accepted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Battle code updated successfully'
    });

  } catch (error) {
    console.error('Error updating battle code:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/mongo/battle-codes - Clean up expired battle codes
export async function DELETE(request: NextRequest) {
  try {
    const db = await connectToMongoDB();

    // Delete expired battle codes (older than 5 minutes)
    const result = await db.collection('battle_codes').deleteMany({
      createdAt: { 
        $lt: new Date(Date.now() - 5 * 60 * 1000) 
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error cleaning up battle codes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}