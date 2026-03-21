# Pass & Play Mode

A fully offline, single-device multiplayer implementation of Undercover.

## Architecture

Pass & Play is 100% client-side with no server dependency after initial word fetch:
- No Socket.IO connections
- No real-time sync
- All game state managed in Zustand + localStorage
- Privacy-first design with screen hiding and device passing flows

## File Structure

```
passAndPlay/
├── PassAndPlayGame.tsx          # Main orchestrator component
├── store/
│   └── passAndPlayStore.ts      # Zustand store with all game logic
├── hooks/
│   ├── usePrivacyGuard.ts       # Visibility change detection
│   ├── usePnPNavGuard.ts        # Browser back button blocking
│   └── useCountdown.ts          # Reusable timer hook
├── components/
│   ├── SetupScreen.tsx          # Player names + settings
│   ├── RoleRevealOrchestrator.tsx
│   ├── RoleRevealCover.tsx      # Black screen "pass to [name]"
│   ├── RoleRevealTapToShow.tsx  # Confirmation before reveal
│   ├── RoleRevealVisible.tsx    # Word display with countdown
│   ├── RoleRevealHidden.tsx     # Confirm + optional peek
│   ├── CluePhaseScreen.tsx      # Turn-based clue entry
│   ├── DiscussionScreen.tsx     # Clue review + start voting
│   ├── VoteOrchestrator.tsx
│   ├── VoteCoverScreen.tsx      # Pass device between voters
│   ├── VoteActiveScreen.tsx     # Private vote selection
│   ├── VoteTallyScreen.tsx      # Animated vote reveal
│   ├── EliminationScreen.tsx    # Role reveal for eliminated
│   ├── MrWhiteGuessScreen.tsx   # Final guess input
│   ├── GameOverScreen.tsx       # Winner + full role table
│   ├── PrivacyGuard.tsx         # Overlay when screen hidden
│   └── ExitConfirmDialog.tsx    # Exit confirmation
└── utils/
    ├── roleAssignment.ts        # Cryptographic role shuffle
    ├── winCondition.ts          # Win condition checks
    ├── voteCounter.ts           # Vote tallying + tie detection
    └── playerOrder.ts           # Turn order management
```

## Key Features

### Privacy Protection
- **Visibility Guard**: Automatically hides sensitive info when app is minimized
- **Cover Screens**: Black screens between players during role reveal and voting
- **Tap-to-Show**: Explicit confirmation before revealing private information
- **One Peek**: Players can re-peek their word once if they missed it

### State Persistence
- Auto-saves to localStorage on every state change
- Resume dialog on app reload
- Schema versioning for safe migrations
- Never restores mid-reveal for security

### Navigation Guards
- Blocks browser back button during active game
- Shows confirmation on tab close/refresh
- Exit dialog with progress warning

### Game Flow
1. **Setup**: Add 3+ players, configure settings, fetch word pair
2. **Role Reveal**: Sequential private reveals with cover screens
3. **Clue Phase**: Turn-based clue entry with optional timer
4. **Discussion**: Review all clues, start voting
5. **Voting**: Sequential private votes with cover screens
6. **Elimination**: Role reveal, check win condition
7. **Mr. White Guess**: If Mr. White eliminated, 10s guess window
8. **Game Over**: Winner announcement + full role table

## Win Conditions (Priority Order)

1. Mr. White guesses civilian word correctly → Mr. White wins
2. All undercoverts + Mr. White eliminated → Civilians win
3. Undercoverts ≥ Civilians → Undercoverts win

## Edge Cases Handled

- Duplicate player names (rejected)
- Word fetch failure (fallback to hardcoded pairs)
- Screen visibility changes during reveal (auto-cover)
- Vote ties (revote/random/skip based on settings)
- All abstentions (no elimination)
- Browser refresh mid-game (resume dialog)
- Multiple tabs (blocked with warning)

## Settings

- **Include Mr. White**: Add Mr. White role (recommended 4+ players)
- **Undercover Count**: 1 or 2 undercoverts
- **Clue Timer**: 30s/60s/90s/unlimited
- **Discussion Timer**: 60s/120s/180s/unlimited
- **Tie Resolution**: Revote/Random/Skip Round
- **Word Peek**: Allow mid-game word re-peek

## API Dependency

Single REST call at setup:
```
GET /api/v1/words/pairs?category={category}&difficulty={difficulty}
```

Fallback to hardcoded pairs if offline.

## Testing Checklist

- [ ] 3-player game (minimum)
- [ ] 8-player game (typical)
- [ ] Mr. White enabled
- [ ] 2 undercoverts
- [ ] Clue timer expiry
- [ ] Vote tie → revote
- [ ] Vote tie → random
- [ ] All abstentions
- [ ] Mr. White correct guess
- [ ] Mr. White wrong guess
- [ ] Civilian win
- [ ] Undercover win
- [ ] Screen hide during reveal
- [ ] Browser refresh mid-game
- [ ] Back button during game
- [ ] Tab close warning

## Future Enhancements

- [ ] Custom word pairs
- [ ] Game history/stats
- [ ] Share results as image
- [ ] Sound effects toggle
- [ ] Haptic feedback
- [ ] Multiple language support
- [ ] Accessibility improvements
