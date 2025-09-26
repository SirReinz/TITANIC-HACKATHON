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
import { Send } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

const recentContacts = [
    { name: "ClashChloe", lastMessage: "Good game!", avatar: "CC" },
    { name: "RivalRick", lastMessage: "You got lucky...", avatar: "RR" },
    { name: "BattleBob", lastMessage: "Rematch tomorrow?", avatar: "BB" },
];

type ChatSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChatSheet({ open, onOpenChange }: ChatSheetProps) {
  // In a real app, this would be dynamic state
  const selectedContact = recentContacts[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="font-headline text-2xl">Chat</SheetTitle>
          <SheetDescription>
            Message other players you've battled.
          </SheetDescription>
        </SheetHeader>
        
        {/* Placeholder for contact list */}
        {/* <div className="px-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Contacts</h3>
            {recentContacts.map(contact => (
                <div key={contact.name} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                    <Avatar>
                        <AvatarFallback>{contact.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{contact.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                    </div>
                </div>
            ))}
        </div>
        <Separator className="my-4" /> */}
        
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-3 px-6 py-4 border-b">
                 <Avatar>
                    <AvatarFallback>{selectedContact.avatar}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold">{selectedContact.name}</h3>
            </div>
          
            <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm">Good game!</p>
                        </div>
                    </div>
                    <div className="flex justify-end">
                         <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm">You too! That was close.</p>
                        </div>
                    </div>
                     <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm">We should play again sometime.</p>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
                <form className="flex items-center gap-2">
                    <Input placeholder="Type a message..." className="flex-1" />
                    <Button type="submit" size="icon" aria-label="Send Message">
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
