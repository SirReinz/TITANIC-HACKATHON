"use client";

import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

type SettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            onOpenChange(false);
            router.push('/login');
             toast({
                title: "Logged Out",
                description: "You have been successfully logged out.",
            });
        } catch (error) {
            console.error("Logout error", error);
            toast({
                variant: "destructive",
                title: "Logout Failed",
                description: "Something went wrong. Please try again.",
            });
        }
    }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-headline text-2xl">Settings</SheetTitle>
          <SheetDescription>
            Manage your account and preferences.
          </SheetDescription>
        </SheetHeader>
        <div className="py-8">
            <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start">Change Details</Button>
                <p className="text-sm text-muted-foreground">Update your username, university, or password.</p>
            </div>
        </div>
        <SheetFooter className="absolute bottom-6 right-6 left-6">
            <Separator className="mb-4" />
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            Log Out
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
