"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import GameUI from '@/components/game/game-ui';

export default function GamePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        // No user is signed in, redirect to login
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <main className="relative h-screen w-screen overflow-hidden bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-800 mb-4">Campus Clash</div>
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-green-600 mt-2">Loading...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null; // This will briefly show while redirecting
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <GameUI />
    </main>
  );
}
