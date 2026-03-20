import QRCode from 'qrcode';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

export function getJoinUrl(code: string): string {
  return `${CLIENT_ORIGIN}/join/${code}`;
}

export async function generateQrDataUrl(code: string): Promise<string> {
  const url = getJoinUrl(code);
  return QRCode.toDataURL(url, { width: 256, margin: 1 });
}
