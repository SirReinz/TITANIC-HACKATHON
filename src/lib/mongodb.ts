import { MongoClient, Db, Collection } from 'mongodb'

// SECURITY: Use environment variables instead of hardcoded credentials
const uri = process.env.MONGODB_URI || 'mongodb+srv://sirreinznegetive8_db_user:XQ2U51QoC74g8zcH@cluster0.2cjvioc.mongodb.net/'
const dbName = process.env.MONGODB_DB_NAME || 'titanic_game'

// Security validation
if (!process.env.MONGODB_URI) {
  console.warn('⚠️ SECURITY WARNING: Using hardcoded MongoDB URI. Set MONGODB_URI environment variable.')
}

// Global variable to store the MongoDB connection
let client: MongoClient | null = null
let db: Db | null = null

export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db
  }

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    await client.connect()
    db = client.db(dbName)
    
    console.log('✅ Connected to MongoDB')
    return db
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

export async function getCollection(collectionName: string): Promise<Collection> {
  const database = await connectToMongoDB()
  return database.collection(collectionName)
}

// Collection helpers
export const getUsers = () => getCollection('users')
export const getLocations = () => getCollection('locations')
export const getMessages = () => getCollection('messages')
export const getBattles = () => getCollection('battles')
export const getBattleCodes = () => getCollection('battle_codes')
export const getDailyBattles = () => getCollection('daily_battles')

// Close connection (for cleanup)
export async function closeMongoDB() {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('🔌 MongoDB connection closed')
  }
}

// Types for our collections
export interface User {
  _id?: string
  uid: string
  email: string
  username: string
  university?: string
  wins?: number
  losses?: number
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface Location {
  _id?: string
  uid: string
  username: string
  latitude: number
  longitude: number
  university?: string
  wins?: number
  losses?: number
  avatar?: string
  timestamp: Date
}

export interface Message {
  _id?: string
  id: string
  text: string
  sender: string
  senderName: string
  participants: string[]
  timestamp: Date
  conversationId?: string
}

export interface Battle {
  _id?: string
  id: string
  player1: string
  player2: string
  player1Name: string
  player2Name: string
  status: 'pending' | 'active' | 'completed'
  winner?: string
  createdAt: Date
  updatedAt: Date
}

export interface BattleCode {
  _id?: string
  code: string
  creator: string
  creatorName: string
  isActive: boolean
  createdAt: Date
  expiresAt: Date
}

export interface DailyBattle {
  _id?: string
  uid: string
  date: string
  battlesPlayed: number
  lastBattleAt: Date
}