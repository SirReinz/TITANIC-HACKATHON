import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoDB } from '@/lib/mongodb';

// GET /api/mongo/battles - Check if participants have battled today
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participant1 = searchParams.get('participant1');
    const participant2 = searchParams.get('participant2');
    const dateParam = searchParams.get('date');

    if (!participant1 || !participant2) {
      return NextResponse.json(
        { success: false, error: 'Both participant IDs are required' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();
    
    // Parse the date parameter or use today
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Check if these participants have battled today
    const existingBattle = await db.collection('battles').findOne({
      participants: { $all: [participant1, participant2] },
      timestamp: {
        $gte: targetDate,
        $lt: nextDay
      }
    });

    return NextResponse.json({
      success: true,
      hasExistingBattle: !!existingBattle,
      battle: existingBattle || null
    });

  } catch (error) {
    console.error('Error checking battle history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/mongo/battles - Create a new battle record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { battleId, participants, winnerId, gameType, timestamp } = body;

    if (!battleId || !participants || !Array.isArray(participants) || participants.length !== 2) {
      return NextResponse.json(
        { success: false, error: 'Battle ID and exactly 2 participants are required' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();

    // Create new battle record
    const battle = {
      battleId,
      participants,
      winnerId: winnerId || null,
      gameType: gameType || 'pong',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      createdAt: new Date()
    };

    const result = await db.collection('battles').insertOne(battle);

    return NextResponse.json({
      success: true,
      battle: {
        ...battle,
        _id: result.insertedId
      }
    });

  } catch (error) {
    console.error('Error creating battle record:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/mongo/battles - Update battle result
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { battleId, winnerId, completedAt } = body;

    if (!battleId) {
      return NextResponse.json(
        { success: false, error: 'Battle ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();

    // Update the battle with result
    const result = await db.collection('battles').updateOne(
      { battleId: battleId },
      {
        $set: {
          winnerId,
          completedAt: completedAt ? new Date(completedAt) : new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Battle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Battle result updated successfully'
    });

  } catch (error) {
    console.error('Error updating battle result:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}