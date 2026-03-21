import { usePassAndPlayStore } from '../store/passAndPlayStore';
import { getAlivePlayers } from '../utils/playerOrder';
import VoteCoverScreen from './VoteCoverScreen';
import VoteActiveScreen from './VoteActiveScreen';
import VoteTallyScreen from './VoteTallyScreen';

export default function VoteOrchestrator() {
  const {
    players,
    voteSubPhase,
    voteCurrentVoterIndex,
    votes,
    advanceVoteCover,
    castVote,
    confirmTally,
  } = usePassAndPlayStore();

  const alivePlayers = getAlivePlayers(players);
  const currentVoter = alivePlayers[voteCurrentVoterIndex];

  switch (voteSubPhase) {
    case 'COVER':
      return (
        <VoteCoverScreen
          voterName={currentVoter?.name || ''}
          onReady={advanceVoteCover}
        />
      );

    case 'ACTIVE':
      return (
        <VoteActiveScreen
          players={players}
          currentVoterId={currentVoter?.id || ''}
          onVote={castVote}
        />
      );

    case 'TALLY':
      return (
        <VoteTallyScreen
          players={players}
          votes={votes}
          onContinue={confirmTally}
        />
      );

    default:
      return null;
  }
}
