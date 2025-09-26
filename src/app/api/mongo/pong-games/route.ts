import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoDB } from '@/lib/mongodb';

// GET /api/mongo/pong-games - Get pong game state
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'Game ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();
    
    // Find the pong game
    const pongGame = await db.collection('pong_games').findOne({ 
      gameId: gameId
    });

    if (!pongGame) {
      return NextResponse.json(
        { success: false, error: 'Pong game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...pongGame
    });

  } catch (error) {
    console.error('Error fetching pong game:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/mongo/pong-games - Update pong game state
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, player1Score, player2Score, player1Ready, player2Ready } = body;

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'Game ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();

    const updateData: any = {};
    if (typeof player1Score === 'number') updateData.player1Score = player1Score;
    if (typeof player2Score === 'number') updateData.player2Score = player2Score;
    if (typeof player1Ready === 'boolean') updateData.player1Ready = player1Ready;
    if (typeof player2Ready === 'boolean') updateData.player2Ready = player2Ready;
    
    updateData.lastUpdate = new Date();

    const result = await db.collection('pong_games').updateOne(
      { gameId: gameId },
      { $set: updateData },
      { upsert: true }
    );

    console.log(`Updated pong game ${gameId}:`, updateData);

    return NextResponse.json({
      success: true,
      message: 'Pong game updated successfully',
      upserted: result.upsertedCount > 0
    });

  } catch (error) {
    console.error('Error updating pong game:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}