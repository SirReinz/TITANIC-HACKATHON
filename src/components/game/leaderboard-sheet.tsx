import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const universityData = [
  { rank: 1, name: "State University", wins: 1024 },
  { rank: 2, name: "Tech U", wins: 980 },
  { rank: 3, name: "City College", wins: 750 },
  { rank: 4, name: "Liberal Arts Academy", wins: 512 },
];

const globalData = [
  { rank: 1, name: "AlphaPlayer", university: "State University", wins: 150 },
  { rank: 2, name: "ClashChloe", university: "State University", wins: 145 },
  { rank: 3, name: "RivalRick", university: "Tech U", wins: 130 },
  { rank: 4, name: "BattleBob", university: "City College", wins: 110 },
  { rank: 5, name: "DuelistDana", university: "Tech U", wins: 105 },
];

type LeaderboardSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LeaderboardSheet({ open, onOpenChange }: LeaderboardSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="font-headline text-2xl">Leaderboards</SheetTitle>
          <SheetDescription>
            See who's dominating the campus and the world.
          </SheetDescription>
        </SheetHeader>
        <div className="p-6">
          <Tabs defaultValue="university">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="university">University</TabsTrigger>
              <TabsTrigger value="global">Global</TabsTrigger>
            </TabsList>
            <TabsContent value="university" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Rank</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead className="text-right">Total Wins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {universityData.map((item) => (
                    <TableRow key={item.rank}>
                      <TableCell className="font-medium">{item.rank}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.wins}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="global" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalData.map((item) => (
                    <TableRow key={item.rank}>
                      <TableCell className="font-medium">{item.rank}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.university}</TableCell>
                      <TableCell className="text-right">{item.wins}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
