import type { WinFaction } from '../../../shared/types';

interface ResultCardParams {
  winner: WinFaction;
  playerWon: boolean;
  nickname: string;
  round: number;
}

interface FactionStyle {
  borderColor: string;
  accentColor: string;
  emoji: string;
  label: string;
}

function getFactionStyle(faction: WinFaction): FactionStyle {
  switch (faction) {
    case 'civilian':
      return { borderColor: '#3b82f6', accentColor: '#3b82f6', emoji: '🏆', label: 'Civilians' };
    case 'undercover':
      return { borderColor: '#ef4444', accentColor: '#ef4444', emoji: '🕵️', label: 'Undercover' };
    case 'mr_white':
      return { borderColor: '#a855f7', accentColor: '#a855f7', emoji: '🤍', label: 'Mr. White' };
  }
}

export async function generateResultCard(params: ResultCardParams): Promise<Blob> {
  const { winner, playerWon, round } = params;
  const style = getFactionStyle(winner);

  const W = 400;
  const H = 220;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, W, H);

  // Border (2px, faction color)
  ctx.strokeStyle = style.borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // "UNDERCOVER" title
  ctx.fillStyle = '#E8C547';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText('UNDERCOVER', W / 2, 28);

  // Large faction emoji (centered)
  ctx.font = '52px serif';
  ctx.textAlign = 'center';
  ctx.fillText(style.emoji, W / 2, 100);

  // Winner faction name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(style.label, W / 2, 140);

  // Player result
  ctx.fillStyle = playerWon ? style.accentColor : '#6b7280';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(playerWon ? 'You won!' : 'You lost.', W / 2, 170);

  // Round count
  ctx.fillStyle = '#6b7280';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Round ${round}`, W / 2, 200);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate result card image'));
    }, 'image/png');
  });
}
