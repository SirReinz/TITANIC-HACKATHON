import GameUI from '@/components/game/game-ui';
import MapPlaceholder from '@/components/game/map-placeholder';

export default function GamePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <MapPlaceholder />
      <GameUI />
    </main>
  );
}
