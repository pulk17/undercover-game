# Tasks: Undercover Game

## Phase 1: Project Scaffold and Infrastructure

- [x] 1.1 Initialize monorepo structure with `/client`, `/server`, `/shared` directories and root `package.json` with workspaces
- [x] 1.2 Scaffold `/server` with Express + TypeScript, Socket.IO, Zod, Helmet, CORS, express-rate-limit, and ts-node-dev
- [x] 1.3 Scaffold `/client` with Vite + React 18 + TypeScript, Tailwind CSS, Framer Motion, React Router v6, Zustand, and vite-plugin-pwa
- [x] 1.4 Create `/shared/types.ts` with all shared types: `WordPair`, `Player`, `Room`, `GameState`, `GameConfig`, `ClueEntry`, `VoteRecord`, `AuthUser`, `GameStateDelta`, and all enums
- [x] 1.5 Configure Firebase Admin SDK on server and Firebase client SDK on client
- [x] 1.6 Configure Upstash Redis client on server with connection pooling
- [x] 1.7 Configure Supabase client on server for PostgreSQL word pair queries
- [x] 1.8 Set up environment variable schemas (Zod) for both client and server
- [x] 1.9 Configure ESLint + Prettier for monorepo with shared config
- [x] 1.10 Set up Vitest for server unit and property tests with fast-check

## Phase 2: Authentication

- [x] 2.1 Implement `POST /api/v1/auth/google` — verify Firebase ID token, issue JWT in httpOnly cookie (30-day expiry)
- [x] 2.2 Implement `POST /api/v1/auth/guest` — create guest session with random nickname
- [x] 2.3 Implement `POST /api/v1/auth/logout` — clear session cookie
- [x] 2.4 Implement `GET /api/v1/auth/me` — return current user profile from Firestore
- [x] 2.5 Implement JWT verification middleware for protected REST routes
- [x] 2.6 Implement Socket.IO auth middleware — verify JWT from cookie before allowing room join
- [x] 2.7 Implement Firestore user document creation on first Google sign-in with all required fields
- [x] 2.8 Implement `PATCH /api/v1/profile/me` — update nickname (max 12 chars, Zod validated) and preferences
- [x] 2.9 Build `AuthStore` (Zustand) with login, logout, setGuest actions
- [x] 2.10 Build Google Sign-In button component with Firebase client SDK and Google One Tap

## Phase 3: Room Management

- [x] 3.1 Implement `RoomManager.createRoom` — generate unique 6-char room code (no 0/O/1/I), write Room to Redis with 24h TTL
- [x] 3.2 Implement `RoomManager.joinRoom` — validate code, check capacity (max 12), check password hash, add player, broadcast updated player list
- [x] 3.3 Implement `RoomManager.leaveRoom` — remove player, broadcast update, trigger host transfer if host left
- [x] 3.4 Implement room expiry — reset Redis TTL on any room activity; delete room and game state on expiry
- [x] 3.5 Implement QR code generation and shareable deep link (`/join/{code}`) on room creation
- [x] 3.6 Implement `room:create`, `room:join`, `room:leave` Socket.IO event handlers
- [x] 3.7 Build `RoomStore` (Zustand) with room, players, isHost state
- [x] 3.8 Build `CreateRoomScreen` — game config form (mode, category, difficulty, timers, tie resolution, toggles)
- [x] 3.9 Build `JoinRoomScreen` — room code input with deep link pre-fill support
- [x] 3.10 Build `RoomLobbyScreen` — player list, QR code display, host config panel, start button

## Phase 4: Word System

- [x] 4.1 Create Supabase PostgreSQL `word_pairs` table with indexes on category+difficulty and language
- [x] 4.2 Seed database with minimum 2,000 base word pairs across 30+ categories, tagged with language/region/difficulty/ageGroup
- [x] 4.3 Implement `WordSelector.selectPair` — query Supabase by category+difficulty+language, apply anti-repeat via Redis SET, return WordPair
- [x] 4.4 Implement `GET /api/v1/words/categories` and `GET /api/v1/words/pairs` endpoints for PWA cache warm
- [x] 4.5 Implement `WordParser.parse` — parse DB record into typed `WordPair`; return descriptive error for missing/invalid fields
- [x] 4.6 Implement `WordSerializer.serialize` — format `WordPair` back to canonical storage format
- [x] 4.7 Implement custom word pair save/list/delete: `POST/GET/DELETE /api/v1/profile/me/words`
- [x] 4.8 Write property test P19: WordPair round-trip serialization (fast-check, 100 runs)
- [x] 4.9 Write property test P9: WordPair structural completeness for all loaded pairs

## Phase 5: Role Distribution and Game Start

- [x] 5.1 Implement `RoleDistributor.distribute` — assign roles per distribution table for N ∈ {3..12}, uniform random shuffle
- [x] 5.2 Implement special mode role overrides: Double Agent (two undercovers, no Mr. White), Mr. White Army (30–40% Mr. White), Reverse Mode (undercover majority)
- [x] 5.3 Implement Detective designation — secretly mark one Civilian as Detective after standard distribution
- [x] 5.4 Implement private role delivery — store `role:{code}:{playerId}` in Redis; emit `game:role_assigned` via `socket.to(socketId).emit()`
- [x] 5.5 Implement `EntitlementService.checkPremium` — verify host holds premium entitlement for paid modes
- [x] 5.6 Implement `game:start` Socket.IO handler — validate host, check player count minimum, check entitlement, run distributor, initialize GameState in Redis
- [x] 5.7 Write property test P5: Role distribution correctness for all valid player counts (fast-check, 100 runs)
- [x] 5.8 Write property test P6: Broadcast GameState never contains role/word/pre-reveal votes (fast-check, 100 runs)

## Phase 6: Role Reveal Phase

- [x] 6.1 Build `RoleRevealScreen` with face-down card initial state and tap-to-flip interaction
- [x] 6.2 Implement card-flip Framer Motion animation (rotateY 0→180, 0.6s easeInOut)
- [x] 6.3 Implement 5-second auto-hide after reveal; Peek button re-shows for 3 seconds
- [x] 6.4 Display role badge: UNDERCOVER (red), DETECTIVE (gold), or blank envelope with "?" for Mr. White
- [x] 6.5 Implement shake gesture to dismiss Role Reveal screen
- [x] 6.6 Implement haptic feedback on role reveal (`navigator.vibrate`)
- [x] 6.7 Implement "Ready" confirmation — all players must confirm before Clue Phase begins

## Phase 7: Clue Phase

- [x] 7.1 Implement `ClueManager.startCluePhase` — determine turn order, set `currentTurnPlayerId` in GameState, emit `game:turn_changed`
- [x] 7.2 Implement `game:clue_submit` handler — validate it's the player's turn and game is in clue phase, append ClueEntry to log, advance turn, emit `game:clue_submitted` and `game:turn_changed`
- [x] 7.3 Implement clue timer — server-side `setTimeout` per turn; on expiry record skipped clue and advance turn
- [x] 7.4 Implement Speed Round mode — 20s hard timer, record strikes, auto-eliminate at 3 strikes
- [x] 7.5 Implement all-clues-submitted detection — when last player submits, emit `game:phase_changed` to discussion
- [x] 7.6 Build `CluePhaseScreen` — clue log, active player indicator, input field (own turn only), countdown timer
- [x] 7.7 Write property test P10: All clues submitted triggers phase transition (fast-check, 100 runs)

## Phase 8: Discussion Phase

- [x] 8.1 Implement `DiscussionManager.startDiscussionPhase` — start countdown timer (or unlimited), emit `game:phase_changed`
- [x] 8.2 Implement `host:extend_discussion` handler — add 30s to `phaseEndsAt`, emit `game:timer_update`
- [x] 8.3 Implement `host:end_discussion` handler (unlimited mode only) — transition to vote phase
- [x] 8.4 Implement timer expiry → auto-transition to vote phase
- [x] 8.5 Build `DiscussionPhaseScreen` — clue log display, countdown timer, host-only extend/end controls

## Phase 9: Voting Phase

- [x] 9.1 Implement `VoteManager.startVotePhase` — open 30s window, emit `game:phase_changed` with active players as targets
- [x] 9.2 Implement `game:vote_cast` handler — validate player is active, not voting for self, not already voted; store in Redis vote buffer; check if all voted
- [x] 9.3 Implement vote reveal — when all voted or timer expires, emit `game:votes_revealed` with full tally
- [x] 9.4 Implement tie resolution: re-vote (new vote phase among tied players), all-survive (cancel elimination), random (pick one tied player)
- [x] 9.5 Build `VotingScreen` — player target cards, vote submission, hidden-until-reveal state, animated vote count increment (Framer Motion spring)
- [x] 9.6 Write property test P11: Votes hidden until reveal condition (fast-check, 100 runs)
- [x] 9.7 Write property test P12: No self-vote (fast-check, 100 runs)

## Phase 10: Elimination and Win Conditions

- [x] 10.1 Implement `GameEngine.evaluateWinCondition` — pure function checking all three win conditions (civilian, undercover, mr_white)
- [x] 10.2 Implement elimination flow — mark player as spectator, emit `game:elimination` (with role if reveal enabled), trigger particle burst animation
- [x] 10.3 Implement Mr. White guess window — 10s window after Mr. White elimination, emit `game:mr_white_window`; handle `game:mr_white_guess`
- [x] 10.4 Implement self-reveal flow — 15s window for Undercover to name civilian word; correct guess = win, fail = eliminated
- [x] 10.5 Implement Final Confrontation mode — at 3 active players, reveal all roles, grant Mr. White final guess before vote
- [x] 10.6 Implement Detective accusation — `detective:accuse` handler; correct = accused eliminated, incorrect = detective eliminated
- [x] 10.7 Implement next-round advance — if no win condition, increment round, start new Clue Phase
- [x] 10.8 Build `EliminationScreen` with particle burst Framer Motion animation
- [x] 10.9 Build `MrWhiteGuessScreen` with 10s countdown
- [x] 10.10 Build `GameOverScreen` with result card and share button
- [x] 10.11 Write property test P13: Civilian win condition (fast-check, 100 runs)
- [x] 10.12 Write property test P14: Undercover win condition (fast-check, 100 runs)
- [x] 10.13 Write property test P15: Mr. White win condition at three players (fast-check, 100 runs)

## Phase 11: Host Controls

- [x] 11.1 Implement `host:kick` — remove player from room, emit `room:player_left` to all
- [x] 11.2 Implement `host:transfer` — swap host flag, emit `host:transferred` to all
- [x] 11.3 Implement `host:pause` / `host:resume` — freeze/resume all active timers, emit `game:paused` / `game:resumed`
- [x] 11.4 Implement `host:reset_to_lobby` — reset GameState to lobby phase, clear round data
- [x] 11.5 Implement `host:end_game` — terminate game, emit `game:winner` with null faction
- [x] 11.6 Build `HostControlsDrawer` component — slide-up drawer with all host actions, visible only to host

## Phase 12: Reconnection and Disconnection Handling

- [x] 12.1 Implement disconnect handler — set `isConnected: false`, write `reconnect:{code}:{playerId}` key to Redis (60s TTL), notify room
- [x] 12.2 Implement reconnect handler — verify reconnect key exists, restore full GameState via `game:state_sync`, re-send private role via `game:role_assigned`
- [x] 12.3 Implement host disconnect → 90s grace period → auto-transfer to next player in join order
- [x] 12.4 Build reconnecting overlay on client — countdown display, auto-reconnect attempt with exponential backoff

## Phase 13: Tournament Mode

- [x] 13.1 Implement `TournamentManager` — run 5 sequential games, track cumulative scores per player
- [x] 13.2 Implement tournament point awards: survive round (+1), correct vote (+2), win as undercover (+5), win as Mr. White (+8)
- [x] 13.3 Implement role rotation — ensure every player is assigned Undercover at least once across 5 games
- [x] 13.4 Build tournament leaderboard display on `GameOverScreen` after game 5

## Phase 14: Progression and Achievements

- [x] 14.1 Implement `ProgressionService.awardXP` — calculate XP from game outcomes per schedule, persist to Firestore, emit `xp:awarded`
- [x] 14.2 Implement level tier computation — pure function mapping XP total to Level enum
- [x] 14.3 Implement `AchievementService.evaluate` — check all 10 achievement criteria after each game, grant once, emit `achievement:unlocked`, persist to Firestore
- [x] 14.4 Build `AchievementToast` overlay component — animated unlock notification
- [x] 14.5 Build `ProfileScreen` — XP bar, level badge, achievement grid, stats
- [x] 14.6 Write property test P16: XP award schedule correctness (fast-check, 100 runs)
- [x] 14.7 Write property test P17: Level tier threshold correctness (fast-check, 100 runs)

## Phase 15: Social Features and Leaderboard

- [x] 15.1 Implement friend search, request, accept/decline, remove: `GET/POST/PATCH/DELETE /api/v1/social/friends`
- [x] 15.2 Implement `GET /api/v1/leaderboard?scope=global|friends|country` — query Firestore, return ranked list
- [x] 15.3 Implement post-game result card image generation (canvas or server-side SVG → PNG)
- [x] 15.4 Implement post-game funny title voting — collect votes, display winner on results screen
- [x] 15.5 Build `LeaderboardScreen` with scope tabs (Global / Friends / Country)

## Phase 16: Local Pass-and-Play Mode

- [x] 16.1 Implement `LocalGameManager` — run full game loop on client without network, using cached word pairs
- [x] 16.2 Implement "Pass to [player name]" handoff screen before each Role Reveal
- [x] 16.3 Implement offline XP/stats queue — store earned data in IndexedDB, sync to REST API on reconnect
- [x] 16.4 Configure Service Worker to cache base word pairs JSON for offline availability

## Phase 17: PWA and Service Worker

- [x] 17.1 Configure vite-plugin-pwa with precache manifest: app shell, route chunks, fonts, base word pairs, icons
- [x] 17.2 Implement cache strategies: Cache First for static assets, Stale-While-Revalidate for word pairs, Network Only for auth/socket
- [x] 17.3 Implement `GET /api/v1/health` endpoint; ping on app load to mitigate cold-start latency
- [x] 17.4 Implement local GameState cache — persist current game state to localStorage; restore on page refresh
- [x] 17.5 Configure web app manifest: name, icons, theme color (#E8C547), display standalone, orientation portrait

## Phase 18: UI Polish and Animations

- [x] 18.1 Implement global Tailwind theme — near-black background, amber/gold accent (#E8C547), role colors (blue/red/purple), Syne + IBM Plex Mono fonts
- [x] 18.2 Implement page transition animations — `pageVariants` with opacity + y-slide, wrapped in `AnimatePresence`
- [x] 18.3 Implement `SpectatorReactionBar` — emoji toolbar for eliminated players, emits `game:reaction`
- [x] 18.4 Enforce 44×44px minimum tap targets on all interactive elements
- [x] 18.5 Implement portrait-only orientation lock via CSS and manifest
- [x] 18.6 Implement high-contrast mode and text scale support in `SettingsScreen`
- [x] 18.7 Build `SplashScreen` with logo animation covering backend cold-start
- [x] 18.8 Build `OnboardingScreen` with swipeable intro cards
- [x] 18.9 Build `HowToPlayScreen` with illustrated rules

## Phase 19: Security and API Hardening

- [x] 19.1 Apply Helmet.js middleware to all Express routes
- [x] 19.2 Configure CORS to allow only the configured frontend origin
- [x] 19.3 Apply express-rate-limit to all public endpoints per the defined thresholds
- [x] 19.4 Implement Socket.IO rate limiting middleware (60 events/min per socket)
- [x] 19.5 Audit all Socket.IO handlers — verify server-side validation for phase, turn, role, and active-player checks
- [x] 19.6 Write property test P1: Room code character invariant (fast-check, 100 runs)
- [x] 19.7 Write property test P3: Nickname length validation (fast-check, 100 runs)
- [x] 19.8 Write property test P18: API validation rejects invalid bodies (fast-check, 100 runs)

## Phase 20: Monitoring and Deployment

- [x] 20.1 Integrate Sentry on both client and server for error tracking
- [x] 20.2 Integrate Firebase Analytics on client for screen views and game events
- [x] 20.3 Configure Uptime Robot monitors for `/api/v1/health` and frontend URL
- [x] 20.4 Configure Vercel deployment for `/client` with environment variables
- [x] 20.5 Configure Render.com deployment for `/server` with environment variables and health check path
- [x] 20.6 Write remaining property tests: P2 (room join), P4 (user structure), P7 (word pair config match), P8 (anti-repeat)
