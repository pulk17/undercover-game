# Pass & Play Quick Start Guide

## For Developers

### Running Locally

```bash
# Install dependencies (if not already done)
cd client
npm install

# Start dev server
npm run dev

# Navigate to http://localhost:5173
# Click "PASS & PLAY" button
```

### Testing the Flow

1. **Setup**
   - Add 3 test players: "Alice", "Bob", "Charlie"
   - Keep default settings
   - Click "START GAME"

2. **Role Reveal**
   - Pass device to Alice → Tap "I AM READY" → Tap "TAP TO SEE MY WORD"
   - Wait 5 seconds → Tap "I'VE SEEN IT"
   - Repeat for Bob and Charlie

3. **Clue Phase**
   - Alice gives clue → Submit
   - Bob gives clue → Submit
   - Charlie gives clue → Submit

4. **Discussion**
   - Review clues
   - Tap "START VOTING"

5. **Voting**
   - Alice votes → Confirm
   - Bob votes → Confirm
   - Charlie votes → Confirm

6. **Elimination**
   - See who was eliminated
   - See their role
   - Tap "CONTINUE"

7. **Game Over** (if win condition met)
   - See winner
   - See all roles
   - Tap "NEW GAME" or "EXIT TO MENU"

### Quick Debug

Open browser console and check:
```javascript
// View current game state
JSON.parse(localStorage.getItem('pnp_game_state'))

// Clear saved game
localStorage.removeItem('pnp_game_state')

// Check Zustand store
window.__ZUSTAND_DEVTOOLS__
```

### Common Issues

**"No word pairs available"**
- Server not running or database empty
- Fallback words will be used automatically

**"Resume game?" dialog on every refresh**
- Expected behavior - game is persisted
- Click "Cancel" to start fresh

**Screen doesn't hide when tabbing away**
- Check browser console for visibility API support
- Test on mobile device for full experience

**Back button doesn't work**
- Expected - navigation is blocked during game
- Use exit dialog instead

### File to Edit for Common Changes

| Change | File |
|--------|------|
| Add new setting | `components/SetupScreen.tsx` + `shared/types.ts` |
| Modify timer duration | `store/passAndPlayStore.ts` (initial state) |
| Change win condition | `utils/winCondition.ts` |
| Update UI styling | Component files (inline styles) |
| Add new phase | `PassAndPlayGame.tsx` + new component |

### Testing Checklist

- [ ] Can add/remove players
- [ ] Can start game with 3+ players
- [ ] Role reveal works for all players
- [ ] Clue phase advances correctly
- [ ] Voting is private
- [ ] Elimination shows role
- [ ] Game over shows winner
- [ ] Can start new game
- [ ] State persists on refresh
- [ ] Exit dialog works

### Performance Tips

- Use React DevTools Profiler to check render times
- Check localStorage size (should be < 50KB)
- Test on low-end mobile device
- Monitor memory usage during long games

### Debugging Store Actions

```typescript
// Add console.log to store actions
submitClue(clue) {
  console.log('submitClue called:', clue);
  // ... rest of action
}
```

### Testing Win Conditions

Manually set roles in store for quick testing:
```typescript
// In browser console after game starts
const store = usePassAndPlayStore.getState();
store.players[0].role = 'MR_WHITE';
store.players[1].role = 'UNDERCOVER';
store.players[2].role = 'CIVILIAN';
```

## For Players

### How to Play

1. **Setup**
   - One person holds the device
   - Add everyone's name
   - Choose settings
   - Start game

2. **Role Reveal**
   - Pass device to first player
   - They tap to see their word privately
   - Pass to next player
   - Repeat until everyone has seen their word

3. **Give Clues**
   - Take turns giving one-word clues about your word
   - Don't say your word directly!
   - Try to be subtle if you're undercover

4. **Discuss**
   - Talk about the clues
   - Figure out who might be undercover

5. **Vote**
   - Pass device to each player
   - Vote privately for who to eliminate
   - Can abstain if unsure

6. **Elimination**
   - See who was eliminated
   - Their role is revealed
   - Continue until someone wins

### Tips

- **For Civilians**: Give obvious clues to find the undercover
- **For Undercover**: Give vague clues that could fit both words
- **For Mr. White**: Listen carefully and improvise!

### Settings Explained

- **Mr. White**: A player with no word who must improvise
- **Undercover Count**: How many players get the different word
- **Clue Timer**: Time limit for giving clues (or unlimited)
- **Tie Resolution**: What happens if votes are tied

### Privacy

- Always pass the device face-down
- Make sure no one is looking over your shoulder
- The app will hide the screen if you switch apps
- You can peek your word once if you forgot it

### Troubleshooting

**"I missed my word!"**
- You get one peek - tap "PEEK AGAIN" when prompted

**"Someone saw my word!"**
- Tap "COVER" button in top-right during reveal

**"I voted for the wrong person!"**
- Sorry, votes are final once confirmed

**"The game froze!"**
- Refresh the page - your progress is saved

**"I want to quit!"**
- Tap back button → Confirm exit
- Warning: Progress will be lost

## Quick Reference

### Roles
- 🟢 **Civilian**: Has the common word, eliminate undercoverts
- 🟣 **Undercover**: Has the different word, survive and blend in
- 🔴 **Mr. White**: Has no word, guess the civilian word to win

### Win Conditions
- **Civilians Win**: Eliminate all undercoverts and Mr. White
- **Undercoverts Win**: Match or outnumber civilians
- **Mr. White Wins**: Guess the civilian word correctly when eliminated

### Keyboard Shortcuts
- `Enter`: Submit clue/vote/guess
- `Esc`: Cancel (where applicable)

### Minimum Requirements
- 3 players minimum
- Modern browser (Chrome, Firefox, Safari)
- Internet connection for initial word fetch (then works offline)

---

**Need Help?** Check the full README.md in this directory.
