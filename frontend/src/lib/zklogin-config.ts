// frontend/src/lib/zklogin-config.ts

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness } from '@mysten/sui/zklogin';

/**
 * zkLogin configuration for Google OAuth
 * Works with both localhost (http) and production (https)
 */
export const ZKLOGIN_CONFIG = {
  // Google OAuth Client ID (from Google Cloud Console)
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  
  // Redirect URI - defaults to localhost for development
  // For production, set VITE_REDIRECT_URI in .env.production
  REDIRECT_URI: import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/auth/callback',
  
  SALT_SERVICE_URL: 'https://salt.api.mystenlabs.com/get_salt',
  ZK_PROVER_URL: 'https://prover-dev.mystenlabs.com/v1',
  
  // Sui Network
  NETWORK: 'testnet' as const,
  
  // zkLogin Provider
  PROVIDER: 'Google' as const,
  
  // Max epoch validity (10 epochs = ~10 days on testnet)
  MAX_EPOCH_OFFSET: 10,
} as const;

/**
 * Storage keys for zkLogin session data
 */
export const STORAGE_KEYS = {
  // Ephemeral keypair (session only)
  EPHEMERAL_KEYPAIR: 'suipass_ephemeral_keypair',
  
  // zkLogin session data (persisted)
  RANDOMNESS: 'suipass_randomness',
  MAX_EPOCH: 'suipass_max_epoch',
  JWT_TOKEN: 'suipass_jwt_token',
  USER_SALT: 'suipass_user_salt',
  ZK_PROOF: 'suipass_zk_proof',
  SUI_ADDRESS: 'suipass_sui_address',
  
  // Session metadata
  LOGIN_TIMESTAMP: 'suipass_login_timestamp',
  GOOGLE_EMAIL: 'suipass_google_email',
} as const;

/**
 * Generate ephemeral keypair for zkLogin session
 * This keypair is temporary and only valid for the current session
 */
export function generateEphemeralKeypair(): Ed25519Keypair {
  const keypair = new Ed25519Keypair();
  
  // Store in sessionStorage (cleared when browser closes)
  sessionStorage.setItem(
    STORAGE_KEYS.EPHEMERAL_KEYPAIR,
    JSON.stringify({
      schema: 'ED25519',
      privateKey: Array.from(keypair.getSecretKey()),
    })
  );
  
  console.log('🔑 Generated ephemeral keypair');
  return keypair;
}

/**
 * Retrieve stored ephemeral keypair
 */
export function getEphemeralKeypair(): Ed25519Keypair | null {
  const stored = sessionStorage.getItem(STORAGE_KEYS.EPHEMERAL_KEYPAIR);
  if (!stored) {
    console.log('⚠️ No ephemeral keypair found in session');
    return null;
  }
  
  try {
    const parsed = JSON.parse(stored);
    const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(parsed.privateKey));
    console.log('✅ Retrieved ephemeral keypair from session');
    return keypair;
  } catch (error) {
    console.error('❌ Failed to parse ephemeral keypair:', error);
    return null;
  }
}

/**
 * Generate randomness for zkLogin nonce
 * This ensures uniqueness of each login session
 */
export function generateZkLoginRandomness(): string {
  const randomness = generateRandomness();
  sessionStorage.setItem(STORAGE_KEYS.RANDOMNESS, randomness);
  console.log('🎲 Generated randomness for nonce');
  return randomness;
}

/**
 * Get stored randomness
 */
export function getStoredRandomness(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.RANDOMNESS);
}

/**
 * Generate nonce for Google OAuth
 * Nonce = hash(ephemeral_public_key, max_epoch, randomness)
 */
export function generateZkLoginNonce(
  ephemeralPublicKey: any, // accept PublicKey or Uint8Array
  maxEpoch: number,
  randomness: string
): string {
  // Some versions of the SDK expect a PublicKey object (with toSuiBytes),
  // some expect raw bytes. Pass through whichever the SDK expects.
  const keyArg =
    ephemeralPublicKey && typeof ephemeralPublicKey.toSuiBytes === 'function'
      ? ephemeralPublicKey // object with method
      : ephemeralPublicKey; // assume Uint8Array

  const nonce = generateNonce(keyArg, maxEpoch, randomness);
  console.log('📝 Generated nonce:', nonce);
  return nonce;
}

/**
 * Store zkLogin session data (persisted across page reloads)
 */
export function storeZkLoginSession(data: {
  jwtToken: string;
  userSalt: string;
  suiAddress: string;
  maxEpoch: number;
  zkProof?: any;
  googleEmail?: string;
}) {
  localStorage.setItem(STORAGE_KEYS.JWT_TOKEN, data.jwtToken);
  localStorage.setItem(STORAGE_KEYS.USER_SALT, data.userSalt);
  localStorage.setItem(STORAGE_KEYS.SUI_ADDRESS, data.suiAddress);
  localStorage.setItem(STORAGE_KEYS.MAX_EPOCH, data.maxEpoch.toString());
  localStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, Date.now().toString());
  
  if (data.zkProof) {
    localStorage.setItem(STORAGE_KEYS.ZK_PROOF, JSON.stringify(data.zkProof));
  }
  
  if (data.googleEmail) {
    localStorage.setItem(STORAGE_KEYS.GOOGLE_EMAIL, data.googleEmail);
  }
  
  console.log('💾 Stored zkLogin session');
}

/**
 * Get stored zkLogin session
 */
export function getZkLoginSession(): {
  jwtToken: string;
  userSalt: string;
  suiAddress: string;
  maxEpoch: number;
  zkProof?: any;
  googleEmail?: string;
  loginTimestamp?: number;
} | null {
  const jwtToken = localStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
  const userSalt = localStorage.getItem(STORAGE_KEYS.USER_SALT);
  const suiAddress = localStorage.getItem(STORAGE_KEYS.SUI_ADDRESS);
  const maxEpoch = localStorage.getItem(STORAGE_KEYS.MAX_EPOCH);
  
  if (!jwtToken || !userSalt || !suiAddress || !maxEpoch) {
    return null;
  }
  
  const zkProofStr = localStorage.getItem(STORAGE_KEYS.ZK_PROOF);
  const googleEmail = localStorage.getItem(STORAGE_KEYS.GOOGLE_EMAIL);
  const loginTimestamp = localStorage.getItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
  
  return {
    jwtToken,
    userSalt,
    suiAddress,
    maxEpoch: parseInt(maxEpoch),
    zkProof: zkProofStr ? JSON.parse(zkProofStr) : undefined,
    googleEmail: googleEmail || undefined,
    loginTimestamp: loginTimestamp ? parseInt(loginTimestamp) : undefined,
  };
}

/**
 * Clear zkLogin session (logout)
 */
export function clearZkLoginSession() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  console.log('🧹 Cleared zkLogin session');
}

/**
 * Check if zkLogin session is valid
 * Validates against current epoch and expiry
 */
export async function isZkLoginSessionValid(currentEpoch: number): Promise<boolean> {
  const session = getZkLoginSession();
  if (!session) {
    console.log('❌ No zkLogin session found');
    return false;
  }
  
  // Check if session expired (maxEpoch passed)
  if (currentEpoch >= session.maxEpoch) {
    console.log('⏰ zkLogin session expired (epoch:', currentEpoch, '>=', session.maxEpoch, ')');
    clearZkLoginSession();
    return false;
  }
  
  // Check if JWT is still valid (simple check)
  if (!session.jwtToken || !session.suiAddress) {
    console.log('❌ zkLogin session incomplete');
    return false;
  }
  
  console.log('✅ zkLogin session valid (expires at epoch', session.maxEpoch, ')');
  return true;
}

/**
 * Decode JWT token to get user info
 */
export function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('❌ Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Validate zkLogin configuration
 */
export function validateZkLoginConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!ZKLOGIN_CONFIG.GOOGLE_CLIENT_ID) {
    errors.push('Missing VITE_GOOGLE_CLIENT_ID in .env.local');
  }
  
  if (!ZKLOGIN_CONFIG.REDIRECT_URI) {
    errors.push('Missing VITE_REDIRECT_URI in .env.local');
  }
  
  if (errors.length > 0) {
    console.error('❌ zkLogin configuration errors:', errors);
    return { valid: false, errors };
  }
  
  console.log('✅ zkLogin configuration valid');
  return { valid: true, errors: [] };
}