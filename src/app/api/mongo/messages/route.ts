import { NextRequest, NextResponse } from 'next/server'
import { getMessages } from '@/lib/mongodb'
import { v4 as uuidv4 } from 'uuid'

// GET - Fetch messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participants = searchParams.get('participants')
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const messagesCollection = await getMessages()
    
    let query = {}
    
    if (conversationId) {
      query = { conversationId }
    } else if (participants) {
      const participantList = participants.split(',').sort()
      query = { participants: { $all: participantList } }
    }

    const messages = await messagesCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()

    // Convert MongoDB _id to string and reverse for chronological order
    const formattedMessages = messages.reverse().map(msg => ({
      ...msg,
      _id: msg._id?.toString(),
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
    }))

    return NextResponse.json({ 
      success: true, 
      messages: formattedMessages 
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/mongo/messages called')
  try {
    const requestData = await request.json()
    console.log('📝 Request data:', requestData)
    
    const { text, sender, senderName, participants, conversationId } = requestData

    if (!text || !sender || !senderName || !participants) {
      console.log('❌ Missing required fields:', { text: !!text, sender: !!sender, senderName: !!senderName, participants: !!participants })
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('📡 Getting messages collection...')
    const messagesCollection = await getMessages()
    console.log('✅ Messages collection obtained')
    
    const newMessage = {
      id: uuidv4(),
      text,
      sender,
      senderName,
      participants: participants.sort(), // Sort for consistent queries
      conversationId: conversationId || `${participants.sort().join('_')}_${Date.now()}`,
      timestamp: new Date(),
    }
    
    console.log('💾 Inserting message:', newMessage)
    const result = await messagesCollection.insertOne(newMessage)
    console.log('✅ Message inserted, result:', result)
    
    const responseMessage = {
      ...newMessage,
      _id: result.insertedId.toString(),
      timestamp: newMessage.timestamp.toISOString(),
    }
    
    console.log('📤 Sending response:', responseMessage)
    
    return NextResponse.json({ 
      success: true, 
      message: responseMessage
    })
  } catch (error) {
    console.error('💥 Error sending message:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}