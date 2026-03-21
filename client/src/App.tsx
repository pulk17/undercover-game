import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { setNavigate } from './stores/gameStore';
import { useRoomStore } from './stores/roomStore';
import { useLocalGameStore } from './stores/localGameStore';
import { ReconnectingOverlay } from './components/ReconnectingOverlay';
import { AchievementToast } from './components/AchievementToast';
import { PageTransition } from './components/PageTransition';
import { SpectatorReactionBar } from './components/SpectatorReactionBar';
import { HostControlsDrawer } from './components/HostControlsDrawer';
import { logScreenView } from './lib/analytics';
import { useAuthStore } from './stores/authStore';
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
import PassAndPlayGame from './features/passAndPlay/PassAndPlayGame';

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
  const room = useRoomStore((state) => state.room);
  const user = useAuthStore((state) => state.user);
  const {
    gameState: localGameState,
    handoffPlayer,
    currentRevealRole,
    isLocalMode,
  } = useLocalGameStore();

  // Wire up the game store's navigation callback so phase changes drive routing
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  useEffect(() => {
    const textScale = user?.preferences?.textScale ?? localStorage.getItem('textScale') ?? 'medium';
    document.documentElement.setAttribute('data-text-scale', textScale);
    localStorage.setItem('textScale', textScale);
  }, [user?.preferences?.textScale]);

  // Log screen views on route changes
  useEffect(() => {
    logScreenView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (!isLocalMode) return;

    if (handoffPlayer) {
      navigate('/game/pass', { replace: true });
      return;
    }

    if (currentRevealRole && localGameState?.phase === 'role_reveal') {
      navigate('/game/reveal', { replace: true });
      return;
    }

    if (!localGameState) return;

    const phaseRouteMap: Record<string, string> = {
      role_reveal: '/game/reveal',
      clue: '/game/clue',
      discussion: '/game/discuss',
      vote: '/game/vote',
      elimination: '/game/elim',
      self_reveal: '/game/elim',
      mr_white_guess: '/game/mrwhite',
      game_over: '/game/over',
    };

    const nextRoute = phaseRouteMap[localGameState.phase];
    if (nextRoute && location.pathname !== nextRoute) {
      navigate(nextRoute, { replace: true });
    }
  }, [currentRevealRole, handoffPlayer, isLocalMode, localGameState, location.pathname, navigate]);

  useEffect(() => {
    if (isLocalMode) return;
    if (room || !location.pathname.startsWith('/game')) return;
    navigate('/lobby', { replace: true });
  }, [isLocalMode, location.pathname, navigate, room]);

  useEffect(() => {
    const shouldLockNavigation =
      location.pathname.startsWith('/game') && (Boolean(room) || isLocalMode);

    if (!shouldLockNavigation) return;

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.pushState({ undercoverLock: true }, '', currentUrl);

    const onPopState = () => {
      window.history.pushState({ undercoverLock: true }, '', currentUrl);
      navigate(currentUrl, { replace: true });
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isLocalMode, location.hash, location.pathname, location.search, navigate, room]);

  if (!ready) {
    return <SplashScreen onDone={() => setReady(true)} />;
  }

  return (
    <>
      <ReconnectingOverlay />
      <AchievementToast />
      <SpectatorReactionBar />
      {(Boolean(room) || isLocalMode) && location.pathname.startsWith('/game') && (
        <HostControlsDrawer gameActive />
      )}
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
          <Route path="/play/local" element={<PassAndPlayGame />} />
          {/* Placeholder routes for future phases */}
          <Route path="/game/*" element={<div className="min-h-screen bg-background text-white flex items-center justify-center">Coming soon...</div>} />
        </Routes>
      </PageTransition>
    </>
  );
}
