import { NextRequest, NextResponse } from 'next/server'
import { getMessages } from '@/lib/mongodb'

// GET - Fetch conversation list for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    const messagesCollection = await getMessages()
    
    // Get all conversations where the user is a participant
    const conversations = await messagesCollection.aggregate([
      {
        $match: {
          participants: userId
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$text" },
          lastSender: { $first: "$senderName" },
          lastTimestamp: { $first: "$timestamp" },
          participants: { $first: "$participants" },
          messageCount: { $sum: 1 }
        }
      },
      {
        $sort: { lastTimestamp: -1 }
      },
      {
        $limit: 20
      }
    ]).toArray()

    // Format the conversations
    const formattedConversations = conversations.map(conv => ({
      conversationId: conv._id,
      lastMessage: conv.lastMessage,
      lastSender: conv.lastSender,
      lastTimestamp: conv.lastTimestamp,
      participants: conv.participants,
      messageCount: conv.messageCount,
      // Get the other participant's name (not the current user)
      otherParticipant: conv.participants.find((p: string) => p !== userId) || 'Unknown'
    }))

    return NextResponse.json({ 
      success: true, 
      conversations: formattedConversations 
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}