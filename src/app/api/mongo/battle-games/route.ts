import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoDB } from '@/lib/mongodb';

// Available games configuration - Only Pong
const AVAILABLE_GAMES = [
  {
    id: 'pong',
    name: 'Pong Battle',
    path: 'react-game',
    description: 'Classic paddle game with real-time multiplayer'
  }
];

// GET /api/mongo/battle-games - Get battle game state
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
    
    // Find the active battle game
    const battleGame = await db.collection('battle_games').findOne({ 
      battleId: battleId,
      status: { $in: ['waiting', 'active', 'completed'] }
    });

    if (!battleGame) {
      return NextResponse.json(
        { success: false, error: 'Battle game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      battleGame: battleGame
    });

  } catch (error) {
    console.error('Error fetching battle game:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/mongo/battle-games - Create new battle game
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { battleId, player1Id, player1Name, player2Id, player2Name } = body;

    if (!battleId || !player1Id || !player1Name || !player2Id || !player2Name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();

    // Check if battle game already exists (race condition handling)
    const existingBattleGame = await db.collection('battle_games').findOne({ 
      battleId: battleId,
      status: { $in: ['waiting', 'active'] }
    });

    if (existingBattleGame) {
      console.log('Battle game already exists, returning existing:', battleId);
      return NextResponse.json({
        success: true,
        battleGame: existingBattleGame
      });
    }

    // Select random game
    const randomGame = AVAILABLE_GAMES[Math.floor(Math.random() * AVAILABLE_GAMES.length)];

    console.log('Creating new battle game:', {
      battleId,
      player1Id,
      player2Id,
      gameName: randomGame.name
    });

    // Create new battle game
    const battleGame = {
      battleId,
      gameId: randomGame.id,
      gameName: randomGame.name,
      gamePath: randomGame.path,
      gameDescription: randomGame.description,
      player1: {
        id: player1Id,
        name: player1Name,
        score: 0,
        ready: false,
        lastPing: new Date()
      },
      player2: {
        id: player2Id,
        name: player2Name,
        score: 0,
        ready: false,
        lastPing: new Date()
      },
      gameState: {
        // Game-specific state will be stored here
        data: {},
        lastUpdate: new Date()
      },
      status: 'waiting', // waiting, active, completed, abandoned
      winner: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null
    };

    let result;
    try {
      result = await db.collection('battle_games').insertOne(battleGame);
      console.log('Battle game created successfully:', {
        battleId,
        insertedId: result.insertedId
      });
    } catch (insertError: any) {
      // If insertion fails due to duplicate key, try to fetch existing
      console.log('Error inserting battle game, checking if it exists:', insertError.message);
      const existingGame = await db.collection('battle_games').findOne({ battleId });
      if (existingGame) {
        console.log('Found existing battle game after insert error:', battleId);
        return NextResponse.json({
          success: true,
          battleGame: existingGame
        });
      }
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      battleGame: {
        ...battleGame,
        _id: result.insertedId
      }
    });

  } catch (error) {
    console.error('Error creating battle game:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/mongo/battle-games - Update battle game state
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { battleId, playerId, action, data } = body;

    if (!battleId || !playerId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToMongoDB();

    let updateQuery: any = {};
    
    switch (action) {
      case 'ping':
        // Update specific player's last ping
        if (data?.isPlayer1) {
          updateQuery = {
            $set: { [`player1.lastPing`]: new Date() }
          };
        } else {
          updateQuery = {
            $set: { [`player2.lastPing`]: new Date() }
          };
        }
        break;

      case 'ready':
        // Mark player as ready
        console.log('Ready action received:', {
          playerId,
          isPlayer1: data?.isPlayer1,
          battleId
        });
        
        const playerField = data?.isPlayer1 ? 'player1.ready' : 'player2.ready';
        console.log('Setting ready field:', playerField);
        
        updateQuery = {
          $set: {
            [playerField]: true
          }
        };

        // Check if both players will be ready after this update
        const currentBattle = await db.collection('battle_games').findOne({ battleId });
        if (currentBattle) {
          const otherPlayerReady = data?.isPlayer1 ? currentBattle.player2?.ready : currentBattle.player1?.ready;
          if (otherPlayerReady) {
            // Both players are ready, also set status to active
            updateQuery.$set.status = 'active';
            updateQuery.$set.startedAt = new Date();
            console.log('Both players ready, automatically starting game');
          }
        }
        break;

      case 'start':
        // Start the game when both players are ready
        updateQuery = {
          $set: {
            status: 'active',
            startedAt: new Date()
          }
        };
        break;

      case 'update_state':
        // Update game state
        updateQuery = {
          $set: {
            'gameState.data': data.gameState || data,
            'gameState.lastUpdate': new Date()
          }
        };
        break;

      case 'update_score':
        // Update player score
        const scoreField = data?.isPlayer1 ? 'player1.score' : 'player2.score';
        updateQuery = {
          $set: {
            [scoreField]: data.score
          }
        };
        break;

      case 'complete':
        // Complete the game
        updateQuery = {
          $set: {
            status: 'completed',
            winner: data.winnerId,
            completedAt: new Date()
          }
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    const result = await db.collection('battle_games').updateOne(
      { battleId: battleId },
      updateQuery
    );

    console.log(`Update result for action ${action}:`, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      battleId
    });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Battle game not found' },
        { status: 404 }
      );
    }

    // For ready action, let's fetch and log the updated state
    if (action === 'ready') {
      const updatedBattleGame = await db.collection('battle_games').findOne({ battleId });
      console.log('Battle game state after ready update:', {
        player1Ready: updatedBattleGame?.player1?.ready,
        player2Ready: updatedBattleGame?.player2?.ready,
        player1Id: updatedBattleGame?.player1?.id,
        player2Id: updatedBattleGame?.player2?.id
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Battle game updated successfully'
    });

  } catch (error) {
    console.error('Error updating battle game:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}