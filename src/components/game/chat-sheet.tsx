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
import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocs,
  limit
} from "firebase/firestore";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  timestamp: any;
  chatId: string;
}

interface NearbyPlayer {
  id: string;
  username: string;
  university: string;
  lastSeen?: any;
  lastMessage?: string;
  lastMessageTime?: any;
  isNearby?: boolean;
}

interface Conversation {
  id: string;
  partnerId: string;
  partnerUsername: string;
  partnerUniversity: string;
  lastMessage: string;
  lastMessageTime: any;
  isNearby: boolean;
  messageCount: number;
}

type ChatSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlayer?: {
    id: string;
    username: string;
    university: string;
  } | null;
  nearbyPlayers?: NearbyPlayer[];
};

export function ChatSheet({ open, onOpenChange, selectedPlayer, nearbyPlayers = [] }: ChatSheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChat, setActiveChat] = useState<NearbyPlayer | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<"nearby" | "conversations">("nearby");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

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
      setActiveChat(selectedPlayer);
    }
  }, [selectedPlayer, open]);

  // Clear state when chat is closed to prevent memory leaks
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setActiveChat(null);
      setNewMessage("");
      // Don't clear recentChats to avoid re-fetching
    }
  }, [open]);

  // Load all conversations (previous chats) - ONLY when button is pressed
  const loadConversations = async () => {
    if (!currentUser) return;

    setIsRefreshing(true);
    try {
      const messagesRef = collection(db, "messages");
      const conversationsQuery = query(
        messagesRef,
        where("participants", "array-contains", currentUser.uid),
        orderBy("timestamp", "desc"),
        limit(100) // Get more messages to build conversation list
      );

      const snapshot = await getDocs(conversationsQuery);
      const conversationMap = new Map<string, Conversation>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const partnerId = data.participants.find((id: string) => id !== currentUser.uid);
        if (partnerId) {
          const partnerUsername = data.senderId === currentUser.uid ? data.receiverUsername : data.senderUsername;
          const partnerUniversity = data.senderId === currentUser.uid ? data.receiverUniversity : data.senderUniversity;
          const isNearby = nearbyPlayers.some(p => p.id === partnerId);
          
          if (!conversationMap.has(partnerId)) {
            conversationMap.set(partnerId, {
              id: partnerId,
              partnerId: partnerId,
              partnerUsername: partnerUsername || "Unknown",
              partnerUniversity: partnerUniversity || "Unknown University",
              lastMessage: data.text,
              lastMessageTime: data.timestamp,
              isNearby: isNearby,
              messageCount: 1
            });
          } else {
            const conversation = conversationMap.get(partnerId)!;
            conversation.messageCount++;
            // Keep the most recent message
            if (data.timestamp > conversation.lastMessageTime) {
              conversation.lastMessage = data.text;
              conversation.lastMessageTime = data.timestamp;
            }
          }
        }
      });

      setConversations(Array.from(conversationMap.values()).sort((a, b) => 
        b.lastMessageTime?.toDate?.()?.getTime?.() - a.lastMessageTime?.toDate?.()?.getTime?.() || 0
      ));
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load conversations only when tab is switched or manually refreshed
  useEffect(() => {
    if (!currentUser || !open) return;
     
    if (activeTab === "conversations" && conversations.length === 0) {
      loadConversations();
    }
  }, [currentUser, open, activeTab]);

  // Function to refresh messages manually
  const refreshMessages = async () => {
    if (!currentUser || !activeChat) return;

    setIsRefreshing(true);
    const chatId = [currentUser.uid, activeChat.id].sort().join("_");
    
    try {
      const messagesRef = collection(db, "messages");
      const messagesQuery = query(
        messagesRef,
        where("chatId", "==", chatId),
        orderBy("timestamp", "asc"),
        limit(100) // Load more messages when manually refreshing
      );

      const snapshot = await getDocs(messagesQuery);
      const refreshedMessages: Message[] = [];
      snapshot.forEach(doc => {
        refreshedMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(refreshedMessages);
    } catch (error) {
      console.error("Error refreshing messages:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load messages for active chat - ONLY when actively chatting
  useEffect(() => {
    if (!currentUser || !activeChat || !open) {
      setMessages([]);
      return;
    }

    const chatId = [currentUser.uid, activeChat.id].sort().join("_");
    
    // Load initial messages once
    const loadMessages = async () => {
      try {
        const messagesRef = collection(db, "messages");
        const messagesQuery = query(
          messagesRef,
          where("chatId", "==", chatId),
          orderBy("timestamp", "asc"),
          limit(50) // Limit to recent 50 messages
        );

        const snapshot = await getDocs(messagesQuery);
        const initialMessages: Message[] = [];
        snapshot.forEach(doc => {
          initialMessages.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(initialMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    loadMessages();

    // No automatic refresh - only manual refresh via button
  }, [currentUser, activeChat, open]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !activeChat) return;

    const chatId = [currentUser.uid, activeChat.id].sort().join("_");
    
    try {
      await addDoc(collection(db, "messages"), {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        senderUsername: currentUser.displayName || "Anonymous",
        receiverId: activeChat.id,
        receiverUsername: activeChat.username,
        chatId,
        participants: [currentUser.uid, activeChat.id],
        timestamp: serverTimestamp(),
      });
      
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
            <SheetTitle className="font-headline text-2xl">Chat</SheetTitle>
            <SheetDescription>
              Connect with nearby players and view your conversation history
            </SheetDescription>
          </SheetHeader>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "nearby" | "conversations")} className="flex-1 flex flex-col">
            <div className="px-6 pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="nearby" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Nearby
                </TabsTrigger>
                <TabsTrigger value="conversations" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Previous
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="nearby" className="flex-1 m-0">
              <ScrollArea className="flex-1 h-full">
                {nearbyPlayers.length > 0 ? (
                  <div className="px-6 py-4">
                    <div className="space-y-2">
                      {nearbyPlayers.map(player => (
                        <div 
                          key={player.id} 
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border"
                          onClick={() => setActiveChat(player)}
                        >
                          <Avatar>
                            <AvatarFallback className="bg-green-100 text-green-700">
                              {getPlayerInitials(player.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{player.username}</p>
                            <p className="text-sm text-muted-foreground">{player.university}</p>
                            <p className="text-xs text-green-600">• Online & Nearby</p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-green-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No nearby players</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enable location sharing to find players within 100m
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="conversations" className="flex-1 m-0">
              <div className="px-6 py-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadConversations}
                  disabled={isRefreshing}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isRefreshing ? "Loading..." : "Refresh Conversations"}
                </Button>
              </div>
              
              <ScrollArea className="flex-1 h-full">
                {conversations.length > 0 ? (
                  <div className="px-6 py-4">
                    <div className="space-y-2">
                      {conversations.map(conversation => (
                        <div 
                          key={conversation.id} 
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border"
                          onClick={() => setActiveChat({
                            id: conversation.partnerId,
                            username: conversation.partnerUsername,
                            university: conversation.partnerUniversity,
                            isNearby: conversation.isNearby
                          })}
                        >
                          <Avatar>
                            <AvatarFallback className={`${conversation.isNearby ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {getPlayerInitials(conversation.partnerUsername)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{conversation.partnerUsername}</p>
                              {conversation.isNearby && (
                                <div className="w-2 h-2 bg-green-500 rounded-full" title="Currently nearby" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{conversation.partnerUniversity}</p>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {conversation.lastMessage}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {conversation.messageCount} messages • {formatTime(conversation.lastMessageTime)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {conversation.isNearby ? (
                              <MessageCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="text-xs text-muted-foreground bg-yellow-100 px-2 py-1 rounded">
                                View Only
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No conversations yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start chatting with nearby players to see your conversation history here
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    );
  }

  // Show active chat
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveChat(null)}
                className="p-1 h-auto"
              >
                ←
              </Button>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getPlayerInitials(activeChat.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="font-headline text-xl">{activeChat.username}</SheetTitle>
                    {nearbyPlayers.some(p => p.id === activeChat.id) && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Currently nearby" />
                    )}
                  </div>
                  <SheetDescription className="text-sm">
                    {activeChat.university}
                    {!nearbyPlayers.some(p => p.id === activeChat.id) && (
                      <span className="text-yellow-600 ml-2">• Not nearby (view only)</span>
                    )}
                  </SheetDescription>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshMessages}
              disabled={isRefreshing}
              className="h-8 px-3"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {isRefreshing ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </SheetHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex ${message.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`rounded-lg p-3 max-w-[80%] ${
                    message.senderId === currentUser?.uid 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 opacity-70 ${
                      message.senderId === currentUser?.uid ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            {nearbyPlayers.some(p => p.id === activeChat.id) ? (
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <Input 
                  placeholder="Type a message..." 
                  className="flex-1" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" size="icon" aria-label="Send Message" disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border">
                <MessageCircle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  You can only send messages when you're both nearby (within 100m)
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
