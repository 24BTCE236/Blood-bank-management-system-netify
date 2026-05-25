export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const asciiToBytes = (input: string) => new Uint8Array(Array.from(input, (char) => char.charCodeAt(0)));

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const hashFounderPassword = async (password: string, salt: string) => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Founder authentication is unavailable in this environment.');
  }

  const digest = await window.crypto.subtle.digest('SHA-256', asciiToBytes(`${salt}:${password}`));
  return bytesToHex(new Uint8Array(digest));
};

export const verifyFounderPassword = async (password: string, salt: string, expectedHash: string) =>
  hashFounderPassword(password, salt).then((hash) => hash === expectedHash);