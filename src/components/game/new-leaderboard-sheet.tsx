"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Users } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from "firebase/firestore";

type LeaderboardSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

interface Player {
  id: string;
  username: string;
  university: string;
  wins: number;
  losses: number;
  winRate: number;
}

interface UniversityStats {
  university: string;
  totalWins: number;
  totalPlayers: number;
  avgWinRate: number;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{rank}</span>;
};

export function LeaderboardSheet({ open, onOpenChange }: LeaderboardSheetProps) {
  const [globalLeaderboard, setGlobalLeaderboard] = useState<Player[]>([]);
  const [universityLeaderboard, setUniversityLeaderboard] = useState<Player[]>([]);
  const [universityStats, setUniversityStats] = useState<UniversityStats[]>([]);
  const [currentUserUniversity, setCurrentUserUniversity] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLeaderboardData();
    }
  }, [open]);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    
    try {
      // Get current user's university
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserUniversity(userData.university || "");
        }
      }

      // Fetch global leaderboard
      const globalQuery = query(
        collection(db, 'users'),
        orderBy('wins', 'desc'),
        limit(50)
      );
      const globalSnapshot = await getDocs(globalQuery);
      const globalPlayers: Player[] = globalSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          username: data.username || 'Anonymous',
          university: data.university || 'Unknown',
          wins: data.wins || 0,
          losses: data.losses || 0,
          winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0,
        };
      });
      setGlobalLeaderboard(globalPlayers);

      // Fetch university leaderboard (only if user has a university)
      if (currentUserUniversity) {
        const universityQuery = query(
          collection(db, 'users'),
          where('university', '==', currentUserUniversity),
          orderBy('wins', 'desc'),
          limit(20)
        );
        const universitySnapshot = await getDocs(universityQuery);
        const universityPlayers: Player[] = universitySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            username: data.username || 'Anonymous',
            university: data.university || 'Unknown',
            wins: data.wins || 0,
            losses: data.losses || 0,
            winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0,
          };
        });
        setUniversityLeaderboard(universityPlayers);
      }

      // Calculate university stats
      const universityMap = new Map<string, { wins: number; players: number; totalBattles: number }>();
      globalPlayers.forEach(player => {
        if (!universityMap.has(player.university)) {
          universityMap.set(player.university, { wins: 0, players: 0, totalBattles: 0 });
        }
        const stats = universityMap.get(player.university)!;
        stats.wins += player.wins;
        stats.players += 1;
        stats.totalBattles += player.wins + player.losses;
      });

      const universityStatsArray: UniversityStats[] = Array.from(universityMap.entries())
        .map(([university, stats]) => ({
          university,
          totalWins: stats.wins,
          totalPlayers: stats.players,
          avgWinRate: stats.totalBattles > 0 ? (stats.wins / stats.totalBattles) * 100 : 0,
        }))
        .sort((a, b) => b.totalWins - a.totalWins)
        .slice(0, 10);

      setUniversityStats(universityStatsArray);

    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <Tabs defaultValue={currentUserUniversity ? "university" : "global"}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="university">My University</TabsTrigger>
              <TabsTrigger value="global">Global</TabsTrigger>
              <TabsTrigger value="universities">Universities</TabsTrigger>
            </TabsList>

            <TabsContent value="university" className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{currentUserUniversity || "No university set"}</span>
              </div>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Wins</TableHead>
                      <TableHead className="text-right">W/L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {universityLeaderboard.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell>{getRankIcon(index + 1)}</TableCell>
                        <TableCell className="font-medium">
                          {player.username}
                          {player.id === auth.currentUser?.uid && (
                            <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{player.wins}</TableCell>
                        <TableCell className="text-right text-xs">
                          {player.wins}/{player.losses}
                          <div className="text-muted-foreground">
                            {player.winRate.toFixed(0)}%
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="global" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead className="text-right">Wins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalLeaderboard.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell>{getRankIcon(index + 1)}</TableCell>
                        <TableCell className="font-medium">
                          {player.username}
                          {player.id === auth.currentUser?.uid && (
                            <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {player.university}
                        </TableCell>
                        <TableCell className="text-right">
                          {player.wins}
                          <div className="text-xs text-muted-foreground">
                            {player.winRate.toFixed(0)}%
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="universities" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead className="text-right">Total Wins</TableHead>
                      <TableHead className="text-right">Players</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {universityStats.map((uni, index) => (
                      <TableRow key={uni.university}>
                        <TableCell>{getRankIcon(index + 1)}</TableCell>
                        <TableCell className="font-medium">
                          {uni.university}
                          {uni.university === currentUserUniversity && (
                            <Badge variant="secondary" className="ml-2 text-xs">Your Uni</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {uni.totalWins}
                          <div className="text-xs text-muted-foreground">
                            {uni.avgWinRate.toFixed(0)}% avg
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{uni.totalPlayers}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}