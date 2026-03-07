const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

function randomSegment(length: number): string {
  let segment = '';
  for (let i = 0; i < length; i++) {
    segment += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return segment;
}

export function generateInviteCode(): string {
  return `AEON-${randomSegment(4)}-${randomSegment(4)}`;
}

export function validateCodeFormat(code: string): boolean {
  return /^AEON-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code);
}
