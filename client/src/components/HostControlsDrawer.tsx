import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Player } from '../../../shared/types';
import { socket, useRoomStore } from '../stores/roomStore';

interface Props {
  gameActive?: boolean;
}

export function HostControlsDrawer({ gameActive = false }: Props) {
  const { isHost, players } = useRoomStore();
  const [open, setOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);

  if (!isHost) return null;

  const otherPlayers: Player[] = players.filter((player) => player.id !== socket.id);

  function handleKick(playerId: string) {
    socket.emit('host:kick', { playerId });
    setKickTarget(null);
  }

  function handleTransfer(newHostId: string) {
    socket.emit('host:transfer', { newHostId });
    setTransferTarget(null);
    setOpen(false);
  }

  function handlePause() {
    socket.emit('host:pause');
  }

  function handleResume() {
    socket.emit('host:resume');
  }

  function handleResetToLobby() {
    if (confirm('Reset game to lobby? All round data will be cleared.')) {
      socket.emit('host:reset_to_lobby');
      setOpen(false);
    }
  }

  function handleEndGame() {
    if (confirm('End the game immediately?')) {
      socket.emit('host:end_game');
      setOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 min-h-[44px] text-sm font-semibold text-black shadow-lg"
        aria-label="Open host controls"
      >
        <span>CTRL</span>
        <span>Host</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black"
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-zinc-900 p-6 pb-10 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-amber-400">Host Controls</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white"
                  aria-label="Close host controls"
                >
                  X
                </button>
              </div>

              <div className="space-y-3">
                {gameActive && (
                  <>
                    <div className="flex gap-3">
                      <HostButton onClick={handlePause} label="Pause" />
                      <HostButton onClick={handleResume} label="Resume" />
                    </div>
                    <HostButton onClick={handleEndGame} label="End Game" danger />
                    <HostButton onClick={handleResetToLobby} label="Reset to Lobby" />
                  </>
                )}

                <div>
                  <p className="mb-1 text-xs text-zinc-400">Kick player</p>
                  {otherPlayers.length === 0 ? (
                    <p className="text-xs text-zinc-500">No other players</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {otherPlayers.map((player) =>
                        kickTarget === player.id ? (
                          <div key={player.id} className="flex gap-1">
                            <button
                              onClick={() => handleKick(player.id)}
                              className="min-h-[44px] rounded bg-red-600 px-2 py-1 text-xs text-white"
                            >
                              Kick {player.nickname}?
                            </button>
                            <button
                              onClick={() => setKickTarget(null)}
                              className="min-h-[44px] rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            key={player.id}
                            onClick={() => setKickTarget(player.id)}
                            className="min-h-[44px] rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-600"
                          >
                            {player.nickname}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs text-zinc-400">Transfer host to</p>
                  {otherPlayers.length === 0 ? (
                    <p className="text-xs text-zinc-500">No other players</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {otherPlayers.map((player) =>
                        transferTarget === player.id ? (
                          <div key={player.id} className="flex gap-1">
                            <button
                              onClick={() => handleTransfer(player.id)}
                              className="min-h-[44px] rounded bg-amber-500 px-2 py-1 text-xs text-black"
                            >
                              Make {player.nickname} host?
                            </button>
                            <button
                              onClick={() => setTransferTarget(null)}
                              className="min-h-[44px] rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            key={player.id}
                            onClick={() => setTransferTarget(player.id)}
                            className="min-h-[44px] rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-600"
                          >
                            {player.nickname}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function HostButton({
  onClick,
  label,
  danger = false,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium ${
        danger ? 'bg-red-700 text-white hover:bg-red-600' : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
      }`}
    >
      {label}
    </button>
  );
}
