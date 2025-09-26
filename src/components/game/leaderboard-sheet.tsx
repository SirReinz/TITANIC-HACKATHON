import React, { useEffect, useState, useRef } from 'react';
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

type LeaderboardUser = {
  uid: string;
  username: string;
  wins: number;
  losses: number;
  winRate: number;
  university?: string;
};

type UniversityStats = {
  name: string;
  totalWins: number;
  totalLosses: number;
  playerCount: number;
  averageWinRate: number;
};

type LeaderboardSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LeaderboardSheet({ open, onOpenChange }: LeaderboardSheetProps) {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [universities, setUniversities] = useState<UniversityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLeaderboardData = async () => {
    try {
      setUpdating(true);
      console.log('🏆 Fetching leaderboard data...');
      const response = await fetch('/api/mongo/users');
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Raw API response:', data);
        if (data.success && data.users) {
          console.log('👥 Raw users data:', data.users);
          // Process users with university data
          const processedUsers: LeaderboardUser[] = data.users
            .map((user: any) => ({
              uid: user.uid,
              username: user.username || user.uid,
              wins: user.wins || 0,
              losses: user.losses || 0,
              university: user.university || 'Unknown',
              winRate: (user.wins + user.losses) > 0 
                ? Math.round((user.wins / (user.wins + user.losses)) * 100) 
                : 0
            }))
            .filter((user: LeaderboardUser) => user.wins > 0 || user.losses > 0) // Only show users with games played
            .sort((a: LeaderboardUser, b: LeaderboardUser) => b.wins - a.wins); // Sort by wins descending

          // Calculate university statistics
          const universityMap = new Map<string, UniversityStats>();
          
          processedUsers.forEach(user => {
            const uniName = user.university || 'Unknown';
            if (!universityMap.has(uniName)) {
              universityMap.set(uniName, {
                name: uniName,
                totalWins: 0,
                totalLosses: 0,
                playerCount: 0,
                averageWinRate: 0
              });
            }
            
            const uniStats = universityMap.get(uniName)!;
            uniStats.totalWins += user.wins;
            uniStats.totalLosses += user.losses;
            uniStats.playerCount += 1;
          });

          // Calculate average win rates and sort universities
          const processedUniversities: UniversityStats[] = Array.from(universityMap.values())
            .map(uni => ({
              ...uni,
              averageWinRate: (uni.totalWins + uni.totalLosses) > 0 
                ? Math.round((uni.totalWins / (uni.totalWins + uni.totalLosses)) * 100) 
                : 0
            }))
            .sort((a, b) => b.totalWins - a.totalWins); // Sort by total wins

          console.log('🔄 Processed users:', processedUsers);
          console.log('🏫 Processed universities:', processedUniversities);
          setUsers(processedUsers);
          setUniversities(processedUniversities);
          setLastUpdated(new Date());
          console.log('✅ Leaderboard updated:', processedUsers.length, 'users,', processedUniversities.length, 'universities');
        }
      } else {
        console.error('❌ Failed to fetch leaderboard data:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  };

  // Auto-update every 1 second when sheet is open
  useEffect(() => {
    if (open) {
      console.log('🔄 Starting leaderboard auto-update (1s interval)');
      // Fetch immediately when opened
      fetchLeaderboardData();
      
      // Set up interval for updates
      intervalRef.current = setInterval(fetchLeaderboardData, 1000);
    } else {
      console.log('⏹️ Stopping leaderboard auto-update');
      // Clear interval when closed
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="font-headline text-2xl">Leaderboards</SheetTitle>
          <SheetDescription>
            Track player rankings, university standings, and battle statistics in real-time.
            {lastUpdated && (
              <div className="text-xs text-muted-foreground mt-1">
                {updating ? '🔄 Updating...' : '✅ Updates every 1s'} • Last: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="p-6">
          {loading ? (
            <div className="text-center p-8">
              <div className="text-muted-foreground">Loading leaderboard...</div>
            </div>
          ) : (
            <Tabs defaultValue="players" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="universities">Universities</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </TabsList>
              
              <TabsContent value="players" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead className="text-right">Wins</TableHead>
                      <TableHead className="text-right">WR%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No players with games played yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user, index) => (
                        <TableRow key={user.uid}>
                          <TableCell className="font-medium">#{index + 1}</TableCell>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{user.university}</TableCell>
                          <TableCell className="text-right font-mono">{user.wins}</TableCell>
                          <TableCell className="text-right font-mono">{user.winRate}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="universities" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Rank</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead className="text-right">Players</TableHead>
                      <TableHead className="text-right">Total Wins</TableHead>
                      <TableHead className="text-right">Avg WR%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {universities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No university data yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      universities.map((uni, index) => (
                        <TableRow key={uni.name}>
                          <TableCell className="font-medium">#{index + 1}</TableCell>
                          <TableCell className="font-medium">{uni.name}</TableCell>
                          <TableCell className="text-right font-mono">{uni.playerCount}</TableCell>
                          <TableCell className="text-right font-mono">{uni.totalWins}</TableCell>
                          <TableCell className="text-right font-mono">{uni.averageWinRate}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="stats" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-2xl font-bold font-mono">{users.length}</div>
                      <div className="text-sm text-muted-foreground">Active Players</div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-2xl font-bold font-mono">{universities.length}</div>
                      <div className="text-sm text-muted-foreground">Universities</div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-2xl font-bold font-mono">
                        {users.reduce((sum, user) => sum + user.wins, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Games Won</div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-2xl font-bold font-mono">
                        {users.length > 0 
                          ? Math.round(users.reduce((sum, user) => sum + user.winRate, 0) / users.length)
                          : 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Win Rate</div>
                    </div>
                  </div>
                  
                  {users.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Top Performer</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="font-medium">{users[0].username}</div>
                        <div className="text-sm text-muted-foreground">
                          {users[0].university} • {users[0].wins} wins ({users[0].winRate}% WR)
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {universities.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Leading University</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="font-medium">{universities[0].name}</div>
                        <div className="text-sm text-muted-foreground">
                          {universities[0].playerCount} players • {universities[0].totalWins} total wins
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
