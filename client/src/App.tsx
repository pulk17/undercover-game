import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { setNavigate } from './stores/gameStore';
import { useLocalGameStore } from './stores/localGameStore';
import { ReconnectingOverlay } from './components/ReconnectingOverlay';
import { AchievementToast } from './components/AchievementToast';
import { PageTransition } from './components/PageTransition';
import { SpectatorReactionBar } from './components/SpectatorReactionBar';
import { logScreenView } from './lib/analytics';
import SplashScreen from './screens/SplashScreen';
import CreateRoomScreen from './screens/CreateRoomScreen';
import JoinRoomScreen from './screens/JoinRoomScreen';
import RoomLobbyScreen from './screens/RoomLobbyScreen';
import RoleRevealScreen from './screens/RoleRevealScreen';
import PassAndPlayScreen from './screens/PassAndPlayScreen';
import CluePhaseScreen from './screens/CluePhaseScreen';
import DiscussionPhaseScreen from './screens/DiscussionPhaseScreen';
import VotingScreen from './screens/VotingScreen';
import EliminationScreen from './screens/EliminationScreen';
import MrWhiteGuessScreen from './screens/MrWhiteGuessScreen';
import GameOverScreen from './screens/GameOverScreen';
import ProfileScreen from './screens/ProfileScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HowToPlayScreen from './screens/HowToPlayScreen';
import { BottomNav } from './components/BottomNav';

/** Wrapper that renders PassAndPlayScreen with data from the local game store */
function LocalPassAndPlayRoute() {
  const { handoffPlayer, confirmHandoff } = useLocalGameStore();
  if (!handoffPlayer) {
    return <Navigate to="/game/reveal" replace />;
  }
  return (
    <PassAndPlayScreen
      playerName={handoffPlayer.nickname}
      onReady={confirmHandoff}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  // Wire up the game store's navigation callback so phase changes drive routing
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  // Log screen views on route changes
  useEffect(() => {
    logScreenView(location.pathname);
  }, [location.pathname]);

  if (!ready) {
    return <SplashScreen onDone={() => setReady(true)} />;
  }

  return (
    <>
      <ReconnectingOverlay />
      <AchievementToast />
      <SpectatorReactionBar />
      <BottomNav />
      <PageTransition>
        <Routes>
          <Route path="/" element={<Navigate to={localStorage.getItem('onboardingDone') ? '/lobby' : '/onboarding'} replace />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/lobby" element={<RoomLobbyScreen />} />
          <Route path="/join" element={<JoinRoomScreen />} />
          <Route path="/join/:code" element={<JoinRoomScreen />} />
          <Route path="/create" element={<CreateRoomScreen />} />
          <Route path="/game/pass" element={<LocalPassAndPlayRoute />} />
          <Route path="/game/reveal" element={<RoleRevealScreen />} />
          <Route path="/game/clue" element={<CluePhaseScreen />} />
          <Route path="/game/discuss" element={<DiscussionPhaseScreen />} />
          <Route path="/game/vote" element={<VotingScreen />} />
          <Route path="/game/elim" element={<EliminationScreen />} />
          <Route path="/game/mrwhite" element={<MrWhiteGuessScreen />} />
          <Route path="/game/over" element={<GameOverScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/leaderboard" element={<LeaderboardScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/how-to-play" element={<HowToPlayScreen />} />
          {/* Placeholder routes for future phases */}
          <Route path="/game/*" element={<div className="min-h-screen bg-background text-white flex items-center justify-center">Coming soon…</div>} />
        </Routes>
      </PageTransition>
    </>
  );
}
