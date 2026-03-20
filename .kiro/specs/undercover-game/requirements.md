# Requirements Document

## Introduction

Undercover is a social deduction web app where players are secretly assigned roles — Civilian, Undercover, or Mr. White — and given related-but-distinct words. Players give one-word or one-phrase clues each round, then vote to eliminate the suspected impostor. The app supports online multiplayer via WebSockets, local pass-and-play, 8 game modes, a word library of 2,000+ pairs, player progression, achievements, and a premium content system. The UI is dark-first, card-based, and animation-rich, built as a PWA with React 18 + TypeScript on the frontend and Node.js + Socket.IO on the backend.

## Glossary

- **Game**: A single session of Undercover from lobby creation to game-over screen.
- **Room**: A virtual space identified by a 6-character alphanumeric code where players gather before and during a Game.
- **Host**: The player who created the Room and controls game configuration.
- **Civilian**: A player role that receives Word A (the main word).
- **Undercover**: A player role that receives Word B (a related but distinct word).
- **Mr_White**: A player role that receives no word and must bluff entirely.
- **Detective**: An optional premium Civilian variant with one private accusation per game.
- **Word_Pair**: A tuple of two related but distinct words (Word A, Word B) drawn from the Word_DB.
- **Word_DB**: The database of all word pairs, tagged by category, difficulty, language, and region.
- **Clue**: A single word or short phrase submitted by a player during the Clue_Phase.
- **Clue_Phase**: The game phase where each active player submits one Clue in turn order.
- **Discussion_Phase**: The open free-form discussion phase following the Clue_Phase.
- **Vote_Phase**: The simultaneous voting phase where players select who to eliminate.
- **Elimination**: The removal of the most-voted player from active play.
- **Spectator**: An eliminated player who observes the remainder of the game.
- **Round**: One complete cycle of Clue_Phase → Discussion_Phase → Vote_Phase → Elimination.
- **Game_State**: The authoritative server-side representation of all game data at any point in time.
- **Room_Code**: The 6-character alphanumeric identifier for a Room (no ambiguous chars 0/O/1/I).
- **XP**: Experience points awarded to authenticated players for in-game actions.
- **Level**: A named tier derived from a player's cumulative XP.
- **Achievement**: A one-time milestone award granted when a player meets defined criteria.
- **Premium**: Features or content available only to players with an active premium subscription or pack purchase.
- **Guest**: An unauthenticated player with a random nickname whose stats are not persisted.
- **PWA**: Progressive Web App — the app is installable and partially functional offline.
- **Socket_Server**: The Node.js + Socket.IO server responsible for real-time game state synchronization.
- **REST_API**: The Express-based HTTP API for non-real-time operations (auth, profiles, word fetch, leaderboard).
- **Redis**: The in-memory store used for active Game_State and pub/sub between server instances.
- **Firestore**: The NoSQL database storing user profiles, stats, achievements, and preferences.
- **Word_Pack**: A named, purchasable or unlockable collection of Word_Pairs beyond the base library.

## Requirements

### Requirement 1: Room Creation and Joining

**User Story:** As a Host, I want to create a Room with a unique code, so that other players can join my game session.

#### Acceptance Criteria

1. WHEN a Host requests a new Room, THE Room_Manager SHALL generate a unique 6-character alphanumeric Room_Code excluding the characters 0, O, 1, and I.
2. WHEN a Room is created, THE Room_Manager SHALL associate the Room with the Host's session and set the Room expiry to 24 hours from the time of last activity.
3. WHEN a Room is created, THE Room_Manager SHALL generate a QR code and a shareable deep link in the format `undercoverapp.io/join/{Room_Code}` for that Room.
4. WHEN a player submits a valid Room_Code, THE Room_Manager SHALL add the player to the Room and broadcast the updated player list to all Room members.
5. IF a player submits a Room_Code that does not correspond to an active Room, THEN THE Room_Manager SHALL return an error message indicating the Room was not found.
6. IF a Room has reached its maximum capacity of 12 players, THEN THE Room_Manager SHALL reject additional join requests with a capacity-full error.
7. WHERE a Host enables password protection, THE Room_Manager SHALL require joining players to submit the correct password before entering the Room.
8. WHEN a Room has had no activity for 24 hours, THE Room_Manager SHALL expire and delete the Room and all associated Game_State from Redis.

---

### Requirement 2: Player Identity and Authentication

**User Story:** As a player, I want to sign in with Google or play as a Guest, so that I can join games with a persistent or temporary identity.

#### Acceptance Criteria

1. WHEN a player initiates Google Sign-In, THE Auth_Service SHALL authenticate the player via Firebase Authentication with Google OAuth 2.0 and issue a JWT stored in an httpOnly cookie valid for 30 days.
2. WHEN an authenticated player's session JWT expires, THE Auth_Service SHALL require the player to re-authenticate before accessing protected routes.
3. WHEN a player chooses Guest mode, THE Auth_Service SHALL assign a random nickname and allow the player to join or create Rooms without persisting stats or achievements.
4. THE Auth_Service SHALL store for each authenticated player: Google UID, display name, avatar URL, custom nickname (maximum 12 characters), game stats, achievements, XP total, purchased Word_Packs, friends list, and preferences.
5. IF a player attempts to set a custom nickname longer than 12 characters, THEN THE Auth_Service SHALL reject the request and return a validation error.
6. WHEN a Guest player completes a game, THE Auth_Service SHALL offer the player the option to upgrade to a full authenticated account to save their session stats.

---

### Requirement 3: Game Configuration

**User Story:** As a Host, I want to configure the game mode, word category, difficulty, timer, and player count, so that the game matches my group's preferences.

#### Acceptance Criteria

1. THE Host_Controls SHALL allow the Host to select one of the 8 defined game modes: Classic, Speed Round, Team Mode, Secret Alliance, Double Agent, Reverse Mode, Mr. White Army, and Tournament Mode.
2. THE Host_Controls SHALL allow the Host to select a word category from the 30+ available base categories.
3. THE Host_Controls SHALL allow the Host to select a difficulty tier: Easy, Medium, or Hard.
4. THE Host_Controls SHALL allow the Host to configure the per-clue timer to one of: 15 seconds, 30 seconds, 60 seconds, or unlimited.
5. THE Host_Controls SHALL allow the Host to configure the Discussion_Phase duration to one of: 60 seconds, 90 seconds, 120 seconds, or unlimited.
6. THE Host_Controls SHALL allow the Host to configure tie-vote resolution to one of: re-vote, all survive, or random elimination.
7. THE Host_Controls SHALL allow the Host to toggle post-Elimination role reveal on or off.
8. WHERE a player count is below the minimum required for a selected game mode, THE Host_Controls SHALL disable the start button and display the minimum player count requirement.
9. WHEN the Host selects a Premium game mode without an active premium entitlement, THE Host_Controls SHALL display a premium upgrade prompt and prevent mode selection.

---

### Requirement 4: Role Distribution

**User Story:** As the game system, I want to assign roles to players according to the defined distribution table, so that each game has the correct balance of Civilians, Undercover players, and Mr. White.

#### Acceptance Criteria

1. WHEN a game starts with N players, THE Role_Distributor SHALL assign roles according to the defined distribution: 3→(2C,1U,0MW), 4→(3C,1U,0MW), 5→(3C,1U,1MW), 6→(4C,1U,1MW), 7→(5C,1U,1MW), 8→(5C,2U,1MW), 9→(6C,2U,1MW), 10→(7C,2U,1MW), 12→(8C,3U,1MW).
2. WHEN roles are distributed, THE Role_Distributor SHALL assign roles randomly with uniform probability across all players.
3. WHEN a game starts in Double Agent mode, THE Role_Distributor SHALL assign two Undercover players each receiving a different related word (Word B and Word C from a three-word faction pair), and SHALL disable the Mr_White role.
4. WHEN a game starts in Mr. White Army mode, THE Role_Distributor SHALL assign 30–40% of players the Mr_White role and assign no Undercover roles.
5. WHEN a game starts in Reverse Mode, THE Role_Distributor SHALL assign the Undercover role to the majority of players and the Civilian role to the minority.
6. WHERE the Detective role is enabled by the Host, THE Role_Distributor SHALL secretly designate one Civilian as the Detective after standard role assignment.
7. THE Role_Distributor SHALL transmit each player's role and word exclusively to that player's private socket channel, never broadcasting role data to the full Room.

---

### Requirement 5: Word Pair Selection

**User Story:** As the game system, I want to select an appropriate Word_Pair for each game, so that players receive fair and engaging words matched to the configured difficulty and category.

#### Acceptance Criteria

1. WHEN a game starts, THE Word_Selector SHALL retrieve a Word_Pair from the Word_DB matching the Host-configured category and difficulty tier.
2. THE Word_Selector SHALL apply anti-repeat logic to avoid selecting a Word_Pair that has already been used in the current session.
3. WHERE a Host has entered a custom Word_Pair, THE Word_Selector SHALL use that custom pair instead of drawing from the Word_DB.
4. WHEN a Host saves a custom Word_Pair, THE Word_DB SHALL persist it to the Host's personal library for future reuse.
5. THE Word_DB SHALL contain a minimum of 2,000 Word_Pairs at launch across all base categories.
6. THE Word_DB SHALL tag each Word_Pair with: language, region, age-group, difficulty tier, and category.
7. WHEN a player's language preference is set to a supported localization (Hindi, Tamil, Telugu, or other Year-1 languages), THE Word_Selector SHALL prefer Word_Pairs tagged with the matching language.

---

### Requirement 6: Role Reveal Phase

**User Story:** As a player, I want to privately view my assigned role and word, so that I know my identity without other players seeing it.

#### Acceptance Criteria

1. WHEN the Role_Reveal phase begins, THE Role_Reveal_Screen SHALL display a face-down card to each player and require a deliberate tap to flip and reveal the role.
2. WHEN a player taps to reveal, THE Role_Reveal_Screen SHALL display the player's word (or a blank envelope with "?" for Mr_White) for exactly 5 seconds before auto-hiding.
3. WHEN a player's role is Undercover, THE Role_Reveal_Screen SHALL display the word alongside a red UNDERCOVER badge.
4. WHEN a player's role is Detective, THE Role_Reveal_Screen SHALL display the word alongside a gold DETECTIVE badge.
5. WHEN a player taps the Peek button after auto-hide, THE Role_Reveal_Screen SHALL re-display the word for 3 seconds.
6. THE Role_Reveal_Screen SHALL play a card-flip animation when the player taps to reveal.
7. WHERE the device supports it, THE Role_Reveal_Screen SHALL trigger haptic vibration feedback when the role is revealed.

---

### Requirement 7: Clue Phase

**User Story:** As a player, I want to submit one clue per round in turn order, so that I can hint at my word without revealing it directly.

#### Acceptance Criteria

1. WHEN the Clue_Phase begins, THE Clue_Manager SHALL determine turn order (starting player configurable by Host) and notify each player when it is their turn.
2. WHEN it is a player's turn, THE Clue_Manager SHALL accept a single text submission of one word or one short phrase as that player's Clue.
3. WHEN a player submits a Clue, THE Clue_Manager SHALL append the Clue to the visible Clue log and advance the turn to the next active player.
4. IF a player's configured clue timer expires before submission, THEN THE Clue_Manager SHALL record a blank/skipped Clue for that player and advance the turn.
5. WHILE the Speed Round mode is active, THE Clue_Manager SHALL enforce a hard 20-second timer per Clue and record one strike against a player who skips.
6. WHILE the Speed Round mode is active and a player has accumulated 3 strikes, THE Clue_Manager SHALL eliminate that player without a vote.
7. THE Clue_Manager SHALL make the full Clue log visible to all players throughout the Clue_Phase and all subsequent phases of the same Round.
8. WHEN all active players have submitted a Clue, THE Clue_Manager SHALL automatically transition the game to the Discussion_Phase.

---

### Requirement 8: Discussion Phase

**User Story:** As a player, I want an open discussion period after clues are given, so that the group can debate and identify the Undercover player.

#### Acceptance Criteria

1. WHEN the Discussion_Phase begins, THE Discussion_Manager SHALL start a countdown timer set to the Host-configured duration (60s, 90s, 120s, or unlimited).
2. WHILE the Discussion_Phase is active, THE Discussion_Manager SHALL display the full Clue log from the current Round to all players.
3. WHEN the Host activates the +30s extension, THE Discussion_Manager SHALL add 30 seconds to the remaining discussion timer.
4. WHEN the Discussion_Phase timer reaches zero, THE Discussion_Manager SHALL automatically transition the game to the Vote_Phase.
5. WHERE the Host has configured unlimited discussion, THE Discussion_Manager SHALL display a manual "End Discussion" button visible only to the Host.

---

### Requirement 9: Voting Phase

**User Story:** As a player, I want to vote simultaneously to eliminate a suspect, so that no player's vote is influenced by seeing others' votes first.

#### Acceptance Criteria

1. WHEN the Vote_Phase begins, THE Vote_Manager SHALL open a 30-second simultaneous voting window and display all active players as vote targets.
2. WHILE the Vote_Phase is active, THE Vote_Manager SHALL hide all submitted votes until either all active players have voted or the 30-second window expires.
3. WHEN all votes are submitted or the timer expires, THE Vote_Manager SHALL reveal all votes simultaneously with an animated vote-count increment.
4. WHEN a single player receives the most votes, THE Vote_Manager SHALL mark that player for Elimination.
5. IF a tie occurs and the Host has configured re-vote resolution, THEN THE Vote_Manager SHALL initiate one additional Vote_Phase among the tied players only.
6. IF a tie occurs and the Host has configured all-survive resolution, THEN THE Vote_Manager SHALL cancel the Elimination for that Round and advance to the next Round.
7. IF a tie occurs and the Host has configured random resolution, THEN THE Vote_Manager SHALL randomly select one of the tied players for Elimination.
8. THE Vote_Manager SHALL prevent a player from voting for themselves.

---

### Requirement 10: Elimination and Win Condition Check

**User Story:** As the game system, I want to eliminate the voted player and check win conditions after each vote, so that the game ends correctly when a faction achieves its objective.

#### Acceptance Criteria

1. WHEN a player is eliminated, THE Game_Engine SHALL display a dramatic elimination animation with a particle burst effect and reveal the eliminated player's role if post-elimination reveal is enabled.
2. WHEN a Mr_White player is eliminated, THE Game_Engine SHALL open a 10-second guess window for Mr_White to submit the Civilian word.
3. IF Mr_White correctly guesses the Civilian word within the guess window, THEN THE Game_Engine SHALL declare Mr_White the winner and end the game.
4. IF Mr_White fails to guess or the guess window expires, THEN THE Game_Engine SHALL confirm the Elimination and proceed with win condition evaluation.
5. WHEN win conditions are evaluated, THE Game_Engine SHALL declare Civilians the winner if all Undercover players and all Mr_White players have been eliminated and at least 2 Civilians remain.
6. WHEN win conditions are evaluated, THE Game_Engine SHALL declare Undercover the winner if the number of active Undercover players equals or exceeds the number of active Civilians.
7. WHEN win conditions are evaluated, THE Game_Engine SHALL declare Mr_White the winner if Mr_White is still active when only 3 players remain.
8. IF no win condition is met after Elimination, THEN THE Game_Engine SHALL advance to the next Round beginning with the Clue_Phase.
9. WHEN an eliminated player's role is confirmed, THE Game_Engine SHALL transition that player to Spectator status with access to an emoji-react toolbar.

---

### Requirement 11: Special Rules and Edge Cases

**User Story:** As a player, I want special game rules (self-reveal, final confrontation, silent round) to be enforced correctly, so that advanced gameplay mechanics work as designed.

#### Acceptance Criteria

1. WHEN an Undercover player voluntarily self-reveals before the Vote_Phase, THE Game_Engine SHALL open a 15-second window for the Undercover player to name the Civilian word.
2. IF the Undercover player correctly names the Civilian word within the self-reveal window, THEN THE Game_Engine SHALL declare that Undercover player the winner.
3. IF the Undercover player fails to name the Civilian word within the self-reveal window, THEN THE Game_Engine SHALL eliminate the Undercover player without a vote.
4. WHEN exactly 3 active players remain, THE Game_Engine SHALL enter Final Confrontation mode, reveal all remaining roles, and grant Mr_White a final guess opportunity before the vote.
5. WHERE the Host has enabled Silent Round, THE Clue_Manager SHALL skip the Clue_Phase for that Round and proceed directly to the Vote_Phase.
6. WHERE the Detective role is active and the Detective submits a private accusation, THE Game_Engine SHALL eliminate the accused player immediately without a vote if the accused is Undercover, or eliminate the Detective immediately if the accused is not Undercover.

---

### Requirement 12: Game Modes — Premium Enforcement

**User Story:** As the system, I want to enforce premium access for paid game modes and word packs, so that monetization boundaries are respected.

#### Acceptance Criteria

1. WHEN a Host attempts to start a game in Team Mode, Secret Alliance, Double Agent, Reverse Mode, or Mr. White Army, THE Entitlement_Service SHALL verify the Host holds an active premium entitlement before allowing the game to start.
2. IF the Host does not hold a premium entitlement, THEN THE Entitlement_Service SHALL display an upgrade prompt and block game start.
3. WHEN a player attempts to access a premium Word_Pack, THE Entitlement_Service SHALL verify the player has purchased or unlocked that pack.
4. THE Entitlement_Service SHALL allow all players in a Room to benefit from the Host's premium mode selection regardless of their own entitlement status.

---

### Requirement 13: Tournament Mode

**User Story:** As a player, I want to play a 5-game tournament bracket with point scoring, so that I can compete across multiple rounds with persistent scores.

#### Acceptance Criteria

1. WHEN Tournament Mode is started, THE Tournament_Manager SHALL run exactly 5 sequential games and track cumulative points for each player.
2. THE Tournament_Manager SHALL award points as follows: survive a Round (+1), cast a correct vote (+2), win as Undercover (+5), win as Mr_White via correct guess (+8).
3. THE Tournament_Manager SHALL rotate roles between games so that every player is assigned the Undercover role at least once across the 5 games.
4. WHEN all 5 games are complete, THE Tournament_Manager SHALL display a final leaderboard ranked by cumulative points.

---

### Requirement 14: Multiplayer Architecture — Online Mode

**User Story:** As a player, I want real-time game state synchronization over the internet, so that all players see the same game state simultaneously regardless of their device.

#### Acceptance Criteria

1. WHEN a player performs any game action (submit Clue, cast vote, send reaction), THE Socket_Server SHALL broadcast the resulting Game_State update to all players in the Room within 500ms under normal network conditions.
2. THE Socket_Server SHALL persist the authoritative Game_State in Redis so that it survives individual server process restarts.
3. WHEN a player disconnects, THE Socket_Server SHALL hold a 60-second reconnect window during which the player's slot is reserved.
4. WHEN a disconnected player reconnects within the 60-second window, THE Socket_Server SHALL restore the full Game_State to that player's client.
5. IF the Host disconnects and does not reconnect within 90 seconds, THEN THE Socket_Server SHALL automatically transfer Host privileges to the next active player in join order.
6. THE Socket_Server SHALL transmit role and word data exclusively over each player's private socket channel, never over the Room broadcast channel.

---

### Requirement 15: Local Pass-and-Play Mode

**User Story:** As a group of players sharing one device, I want to play without an internet connection, so that we can enjoy the game anywhere.

#### Acceptance Criteria

1. WHEN a Host selects Local (Pass-and-Play) mode, THE Local_Game_Manager SHALL run the full game on a single device without requiring a network connection after the initial word data load.
2. WHEN it is a player's turn to view their role, THE Local_Game_Manager SHALL display a "Pass to [player name]" handoff screen before showing the Role_Reveal_Screen.
3. THE Local_Game_Manager SHALL cache the required Word_Pairs locally via the PWA Service Worker so that gameplay is available offline after first load.
4. WHEN the device regains network connectivity after an offline session, THE Local_Game_Manager SHALL sync any earned XP and stats to the server for authenticated players.

---

### Requirement 16: Host Controls

**User Story:** As a Host, I want in-game controls to manage the session, so that I can handle disruptions and keep the game running smoothly.

#### Acceptance Criteria

1. THE Host_Controls SHALL provide the Host with the ability to: kick a player, transfer Host privileges, mute the clue timer, pause the game, extend the Discussion_Phase by 30 seconds, force-start the game, reset the game to lobby, and end the game early.
2. WHEN the Host kicks a player, THE Host_Controls SHALL remove that player from the Room and notify all remaining players.
3. WHEN the Host transfers Host privileges, THE Host_Controls SHALL grant the selected player full Host_Controls access and revoke the original Host's Host_Controls access.
4. WHEN the Host pauses the game, THE Host_Controls SHALL freeze all active timers and display a paused indicator to all players until the Host resumes.

---

### Requirement 17: Player Progression — XP and Levels

**User Story:** As an authenticated player, I want to earn XP and advance through level tiers, so that I have a sense of progression and achievement.

#### Acceptance Criteria

1. WHEN an authenticated player completes a game, THE Progression_Service SHALL award XP according to the defined schedule: play any game (+10), win as Civilian (+20), win as Undercover (+40), win as Mr_White via correct guess (+60), survive 3+ rounds (+15), cast a correct vote (+10), daily play bonus (+25).
2. WHEN a player's cumulative XP crosses a Level threshold, THE Progression_Service SHALL update the player's Level to the appropriate tier: Rookie (1–5), Agent (6–15), Operative (16–30), Infiltrator (31–50), Mastermind (51–80), Phantom (81+).
3. THE Progression_Service SHALL NOT award XP to Guest players.
4. WHEN a player earns XP, THE Progression_Service SHALL persist the updated XP total and Level to Firestore.

---

### Requirement 18: Achievements

**User Story:** As a player, I want to unlock achievements for notable in-game accomplishments, so that I am rewarded for skill and consistency.

#### Acceptance Criteria

1. THE Achievement_Service SHALL define and track the following 10 achievements: First Spy (win first game as Undercover), Ghost (survive a full game without being voted), Sharpshooter (correctly vote the Undercover 3 times), Mind Reader (correctly guess civilian word as Mr_White), Last Standing (win as the sole surviving Civilian), Silver Tongue (win as Undercover with 8+ players), 7-Day Streak (play on 7 consecutive days), Globetrotter (play in 5 different word categories), Champion (win a Tournament Mode), Social Butterfly (play with 10 unique players).
2. WHEN a player meets the criteria for an achievement, THE Achievement_Service SHALL grant the achievement exactly once and display an unlock notification to the player.
3. THE Achievement_Service SHALL persist all unlocked achievements to Firestore and display them on the player's Profile screen.

---

### Requirement 19: Social Features

**User Story:** As a player, I want to add friends, view leaderboards, and share results, so that I can compete and connect with others.

#### Acceptance Criteria

1. THE Social_Service SHALL allow authenticated players to search for other players by nickname, send friend requests, accept or decline incoming requests, and view online status of friends.
2. WHEN a player is on the friends list, THE Social_Service SHALL display that friend's online status and provide a quick-invite button to send a Room join link.
3. THE Leaderboard_Service SHALL maintain and display three leaderboard scopes: Global, Friends, and Country, ranked by cumulative XP.
4. WHEN a game ends, THE Share_Service SHALL generate a shareable result card image that the player can post to Instagram or WhatsApp.
5. WHEN a game ends, THE Social_Service SHALL allow all players to vote on a funny post-game title for each player, and display the winning title on the results screen.

---

### Requirement 20: UI Design and Animations

**User Story:** As a player, I want a visually stunning, responsive, and accessible UI, so that the game feels polished and is easy to use on any device.

#### Acceptance Criteria

1. THE UI SHALL use a dark-first color scheme with a near-black background, Amber/Gold (#E8C547) as the primary accent, Blue for Civilian role elements, Red for Undercover role elements, and Purple for Mr_White role elements.
2. THE UI SHALL use Syne or equivalent geometric bold typeface for headings, a sans-serif typeface for body UI text, and IBM Plex Mono for Room codes, timers, and labels.
3. THE UI SHALL implement the following microanimations: card-flip on role reveal, animated vote-count increment during vote reveal, and particle burst on player elimination.
4. THE UI SHALL enforce a minimum tap target size of 44×44 pixels for all interactive elements.
5. THE UI SHALL support high-contrast mode and text size scaling for accessibility.
6. WHERE the device supports it, THE UI SHALL trigger haptic vibration feedback on turn notifications and role reveals.
7. THE UI SHALL restrict gameplay screens to portrait orientation.
8. THE UI SHALL present exactly one primary action per gameplay screen.
9. WHEN a player is on a private screen (Role_Reveal), THE UI SHALL support a shake gesture to dismiss the screen.

---

### Requirement 21: PWA and Offline Support

**User Story:** As a player, I want the app to be installable and partially functional offline, so that I can play pass-and-play games without an internet connection.

#### Acceptance Criteria

1. THE PWA_Service_Worker SHALL cache all static assets, UI components, and base Word_Pairs on first load so that the app shell and local game mode are available without a network connection.
2. WHEN the app is loaded on a supported browser, THE PWA_Service_Worker SHALL register a service worker and make the app installable to the home screen.
3. WHEN the client application loads, THE Client SHALL ping the REST_API `/health` endpoint to mitigate backend cold-start latency, with the splash screen animation covering the wake time.
4. THE Client SHALL cache the current Game_State locally so that a page refresh during an active game does not result in total state loss for the local player.

---

### Requirement 22: API Security and Reliability

**User Story:** As the system operator, I want the API to be secure and rate-limited, so that the app is protected against abuse and unauthorized access.

#### Acceptance Criteria

1. THE REST_API SHALL validate all incoming request bodies using Zod schemas and return a 400 error with a descriptive message for any validation failure.
2. THE REST_API SHALL apply rate limiting via express-rate-limit to all public endpoints, rejecting requests that exceed the configured threshold with a 429 response.
3. THE REST_API SHALL set security headers via Helmet.js on all responses.
4. THE REST_API SHALL enforce CORS to allow requests only from the configured frontend origin.
5. THE Auth_Service SHALL store JWTs exclusively in httpOnly cookies and SHALL NOT expose tokens via response bodies or localStorage.
6. THE Socket_Server SHALL authenticate each socket connection by verifying the player's JWT before allowing the connection to join a Room channel.

---

### Requirement 23: Word System — Parsing and Serialization

**User Story:** As the system, I want word pair data to be reliably parsed, stored, and retrieved, so that games always receive valid and correctly formatted word data.

#### Acceptance Criteria

1. WHEN a Word_Pair is loaded from the Word_DB, THE Word_Parser SHALL parse the stored record into a typed WordPair object with fields: id, wordA, wordB, category, difficulty, language, region, and ageGroup.
2. IF a stored word record is missing required fields or contains invalid values, THEN THE Word_Parser SHALL return a descriptive parse error and skip that record.
3. THE Word_Serializer SHALL format WordPair objects back into the canonical storage format used by the Word_DB.
4. FOR ALL valid WordPair objects, parsing then serializing then parsing SHALL produce an equivalent WordPair object (round-trip property).
5. WHEN a custom Word_Pair is submitted by a Host, THE Word_Parser SHALL validate and parse the input before persisting it to the personal library.
