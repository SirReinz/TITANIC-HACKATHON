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
import { Send, MessageCircle } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
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
  const [recentChats, setRecentChats] = useState<NearbyPlayer[]>([]);
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

  // Load recent chats (players you've messaged) - ONE TIME ONLY when chat opens
  useEffect(() => {
    if (!currentUser || !open || recentChats.length > 0) return;

    const loadRecentChats = async () => {
      try {
        const messagesRef = collection(db, "messages");
        const recentQuery = query(
          messagesRef,
          where("participants", "array-contains", currentUser.uid),
          orderBy("timestamp", "desc"),
          limit(20)
        );

        const snapshot = await getDocs(recentQuery);
        const chatPartners = new Map<string, NearbyPlayer>();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const partnerId = data.participants.find((id: string) => id !== currentUser.uid);
          if (partnerId && !chatPartners.has(partnerId)) {
            chatPartners.set(partnerId, {
              id: partnerId,
              username: data.senderUsername === currentUser.displayName ? data.receiverUsername : data.senderUsername,
              university: data.senderUniversity === currentUser.displayName ? data.receiverUniversity : data.senderUniversity || "Unknown University"
            });
          }
        });

        setRecentChats(Array.from(chatPartners.values()));
      } catch (error) {
        console.error("Error loading recent chats:", error);
      }
    };

    loadRecentChats();
  }, [currentUser, open]);

  // Listen to messages for active chat - ONLY when actively chatting
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

    // Refresh messages every 10 seconds while chat is active (much less aggressive)
    const intervalId = setInterval(loadMessages, 10000);

    return () => {
      clearInterval(intervalId);
    };
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
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="font-headline text-2xl">Chat</SheetTitle>
            <SheetDescription>
              Message nearby players
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            {/* Nearby Players */}
            {nearbyPlayers.length > 0 && (
              <div className="px-6 mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Nearby Players</h3>
                <div className="space-y-2">
                  {nearbyPlayers.map(player => (
                    <div 
                      key={player.id} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
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
                      </div>
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Chats */}
            {recentChats.length > 0 && (
              <div className="px-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Chats</h3>
                <div className="space-y-2">
                  {recentChats.map(player => (
                    <div 
                      key={player.id} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => setActiveChat(player)}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {getPlayerInitials(player.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{player.username}</p>
                        <p className="text-sm text-muted-foreground">{player.university}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nearbyPlayers.length === 0 && recentChats.length === 0 && (
              <div className="px-6 py-12 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No nearby players found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Enable location sharing to find players nearby
                </p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Show active chat
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
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
                <SheetTitle className="font-headline text-xl">{activeChat.username}</SheetTitle>
                <SheetDescription className="text-sm">
                  {activeChat.university}
                </SheetDescription>
              </div>
            </div>
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
