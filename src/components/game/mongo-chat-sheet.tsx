import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Send, MessageCircle, RefreshCw, Users, History } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useState, useEffect, useRef, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Message {
  _id?: string;
  id: string;
  text: string;
  sender: string;
  senderName: string;
  participants: string[];
  conversationId: string;
  timestamp: string;
}

interface NearbyPlayer {
  uid: string;
  username: string;
  university: string;
  distance: number;
  wins?: number;
  losses?: number;
  avatar?: string;
}

interface Conversation {
  conversationId: string;
  lastMessage: string;
  lastSender: string;
  lastTimestamp: string;
  participants: string[];
  messageCount: number;
  otherParticipant: string;
}

type MongoChatSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlayer?: {
    uid: string;
    username: string;
    university: string;
  } | null;
  currentLocation?: {
    latitude: number;
    longitude: number;
  } | null;
};

export function MongoChatSheet({ open, onOpenChange, selectedPlayer, currentLocation }: MongoChatSheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChat, setActiveChat] = useState<NearbyPlayer | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [activeTab, setActiveTab] = useState<"nearby" | "conversations">("nearby");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [authUser, setAuthUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        setAuthError(null);
      } else {
        // Use demo user for testing when not authenticated
        setAuthUser({
          uid: 'demo-user-mongodb',
          displayName: 'Demo User (MongoDB)',
          email: 'demo@mongodb.test'
        });
        setAuthError('Using demo mode - please log in for full functionality');
      }
    });

    return () => unsubscribe();
  }, []);
  
  const currentUser = authUser;

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set active chat when selectedPlayer changes
  useEffect(() => {
    if (selectedPlayer && open) {
      setActiveChat({
        uid: selectedPlayer.uid,
        username: selectedPlayer.username,
        university: selectedPlayer.university,
        distance: 0, // Will be calculated by nearby API
      });
    }
  }, [selectedPlayer, open]);

  // Clear state when chat is closed
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setActiveChat(null);
      setNewMessage("");
      setConversationId("");
      // Clear refresh interval when chat is closed
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    }
  }, [open]);

  // Load nearby players
  const loadNearbyPlayers = useCallback(async () => {
    if (!currentUser || !currentLocation || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/mongo/locations?lat=${currentLocation.latitude}&lng=${currentLocation.longitude}&radius=1&currentUserId=${currentUser.uid}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNearbyPlayers(data.players || []);
        }
      }
    } catch (error) {
      console.error("Error loading nearby players:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser, currentLocation]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/mongo/conversations?userId=${currentUser.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversations(data.conversations || []);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser]);

  // Load messages for active chat
  const loadMessages = useCallback(async (isAutoRefresh = false) => {
    if (!currentUser || !activeChat) return;
    
    // Skip refresh check for auto-refresh to prevent blocking
    if (!isAutoRefresh && isRefreshing) return;

    if (!isAutoRefresh) setIsRefreshing(true);
    try {
      const participants = [currentUser.uid, activeChat.uid].sort().join(',');
      const response = await fetch(`/api/mongo/messages?participants=${participants}&limit=50`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Messages loaded:', data); // Debug log
        if (data.success) {
          console.log('Setting messages to:', data.messages); // Debug log
          setMessages(data.messages || []);
          // Set conversation ID from first message if available
          if (data.messages && data.messages.length > 0) {
            setConversationId(data.messages[0].conversationId);
          }
        } else {
          console.error('Failed to load messages:', data);
        }
      } else {
        console.error('HTTP error loading messages:', response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      if (!isAutoRefresh) setIsRefreshing(false);
    }
  }, [currentUser, activeChat]);

  // Handle active chat changes and auto-refresh
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      setConversationId("");
      // Clear any existing refresh interval
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    } else if (activeChat && open) {
      // Load messages immediately when chat becomes active
      loadMessages(false);
      
      // Start auto-refresh every 5 seconds
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
      
      refreshInterval.current = setInterval(() => {
        console.log('🔄 Auto-refreshing messages...');
        loadMessages(true);
      }, 5000);
    }

    // Cleanup interval when component unmounts or chat changes
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    };
  }, [activeChat, open, loadMessages]);

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 sendMessage called');
    console.log('Current user:', currentUser);
    console.log('Active chat:', activeChat);
    console.log('New message:', newMessage);
    
    if (!newMessage.trim() || !currentUser || !activeChat) {
      console.log('❌ Validation failed:', {
        hasMessage: !!newMessage.trim(),
        hasCurrentUser: !!currentUser,
        hasActiveChat: !!activeChat
      });
      return;
    }

    try {
      const participants = [currentUser.uid, activeChat.uid].sort();
      const messageData = {
        text: newMessage.trim(),
        sender: currentUser.uid,
        senderName: currentUser.displayName || "Anonymous",
        participants,
        conversationId: conversationId || `${participants.join('_')}_${Date.now()}`,
      };
      
      console.log('📤 Sending message data:', messageData);
      
      const response = await fetch('/api/mongo/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Message sent response:', data); // Debug log
        if (data.success) {
          // Add the new message to the list
          setMessages(prev => {
            console.log('Adding message to list:', data.message); // Debug log
            console.log('Current messages:', prev); // Debug log
            return [...prev, data.message];
          });
          setNewMessage("");
          // Update conversation ID if it was newly created
          if (!conversationId && data.message.conversationId) {
            setConversationId(data.message.conversationId);
          }
          // Removed auto-refresh to prevent infinite loops
          // Users can manually refresh if needed
        } else {
          console.error('Failed to send message:', data);
        }
      } else {
        console.error('HTTP error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPlayerInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Show player list if no active chat
  if (!activeChat) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle className="font-headline text-2xl">💬 MongoDB Chat</SheetTitle>
            <SheetDescription>
              Connect with nearby players and view your conversation history
              {authError && (
                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
                  ⚠️ {authError}
                </div>
              )}
            </SheetDescription>
          </SheetHeader>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "nearby" | "conversations")} className="flex-1 flex flex-col">
            <div className="px-6 pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="nearby" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Nearby ({nearbyPlayers.length})
                </TabsTrigger>
                <TabsTrigger value="conversations" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Previous ({conversations.length})
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="nearby" className="flex-1 m-0">
              <div className="px-6 pb-4">
                <Button 
                  onClick={loadNearbyPlayers} 
                  disabled={isRefreshing || !currentLocation}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Nearby Players'}
                </Button>
                {!currentLocation && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Share your location to see nearby players
                  </p>
                )}
              </div>
              
              <ScrollArea className="flex-1 h-full">
                <div className="px-6 space-y-3">
                  {nearbyPlayers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No nearby players found</p>
                      <p className="text-xs mt-1">Try refreshing or move to a different area</p>
                    </div>
                  ) : (
                    nearbyPlayers.map((player) => (
                      <div
                        key={player.uid}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => setActiveChat(player)}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getPlayerInitials(player.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{player.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{player.university}</p>
                          <p className="text-xs text-muted-foreground">
                            {player.distance < 1 
                              ? `${Math.round(player.distance * 1000)}m away` 
                              : `${player.distance.toFixed(1)}km away`
                            } • W:{player.wins || 0} L:{player.losses || 0}
                          </p>
                        </div>
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="conversations" className="flex-1 m-0">
              <div className="px-6 pb-4">
                <Button 
                  onClick={loadConversations} 
                  disabled={isRefreshing}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Loading...' : 'Refresh Conversations'}
                </Button>
              </div>
              
              <ScrollArea className="flex-1 h-full">
                <div className="px-6 space-y-3">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No previous conversations</p>
                      <p className="text-xs mt-1">Start chatting with nearby players!</p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.conversationId}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => setActiveChat({
                          uid: conversation.otherParticipant,
                          username: conversation.otherParticipant, // Will be updated when we load player data
                          university: "Unknown",
                          distance: 0,
                        })}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getPlayerInitials(conversation.otherParticipant)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{conversation.otherParticipant}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastSender}: {conversation.lastMessage}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(conversation.lastTimestamp)} • {conversation.messageCount} messages
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    );
  }

  // Chat interface when a player is selected
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveChat(null)}
              className="p-1 h-8 w-8"
            >
              ←
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarImage src={activeChat.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {getPlayerInitials(activeChat.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg truncate">{activeChat.username}</SheetTitle>
              <SheetDescription className="text-xs truncate">
                {activeChat.university}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadMessages(false)}
              disabled={isRefreshing}
              className="p-1 h-8 w-8"
              title="Refresh Messages"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message._id || message.id}
                  className={`flex ${
                    message.sender === currentUser?.uid ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === currentUser?.uid
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender === currentUser?.uid
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        <form onSubmit={sendMessage} className="p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              maxLength={500}
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}