// frontend/src/hooks/useZkLogin.ts

import { useState, useEffect, useCallback } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { genAddressSeed, getZkLoginSignature } from '@mysten/sui/zklogin';
import { jwtToAddress } from '@mysten/sui/zklogin';
import {
  ZKLOGIN_CONFIG,
  generateEphemeralKeypair,
  generateZkLoginRandomness,
  generateZkLoginNonce,
  storeZkLoginSession,
  getZkLoginSession,
  clearZkLoginSession,
  isZkLoginSessionValid,
  getEphemeralKeypair,
  getStoredRandomness,
  decodeJWT,
  validateZkLoginConfig,
} from '../lib/zklogin-config';

interface ZkLoginState {
  isAuthenticated: boolean;
  suiAddress: string | null;
  googleEmail: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for zkLogin authentication with Google OAuth
 */
export function useZkLogin() {
  const suiClient = useSuiClient();
  const [state, setState] = useState<ZkLoginState>({
    isAuthenticated: false,
    suiAddress: null,
    googleEmail: null,
    isLoading: true,
    error: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Validate config first
        const configValidation = validateZkLoginConfig();
        if (!configValidation.valid) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'zkLogin not configured. Please set VITE_GOOGLE_CLIENT_ID in .env.local',
          }));
          return;
        }

        const session = getZkLoginSession();
        if (!session) {
          console.log('📭 No existing zkLogin session');
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Get current epoch to check session validity
        const { epoch } = await suiClient.getLatestSuiSystemState();
        const currentEpoch = Number(epoch);

        const isValid = await isZkLoginSessionValid(currentEpoch);
        if (isValid) {
          console.log('✅ Restored zkLogin session for:', session.googleEmail);
          setState({
            isAuthenticated: true,
            suiAddress: session.suiAddress,
            googleEmail: session.googleEmail || null,
            isLoading: false,
            error: null,
          });
        } else {
          console.log('⏰ Session expired, need to re-login');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('❌ Session check error:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: error instanceof Error ? error.message : 'Session check failed',
        }));
      }
    };

    checkSession();
  }, [suiClient]);

  /**
   * Start Google OAuth login flow
   */
  const loginWithGoogle = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      console.log('🔐 Starting zkLogin flow...');

      // Validate configuration
      const configValidation = validateZkLoginConfig();
      if (!configValidation.valid) {
        throw new Error(`Configuration error: ${configValidation.errors.join(', ')}`);
      }

      // Get current epoch
      const { epoch } = await suiClient.getLatestSuiSystemState();
      const currentEpoch = Number(epoch);
      const maxEpoch = currentEpoch + ZKLOGIN_CONFIG.MAX_EPOCH_OFFSET;

      console.log('📅 Current epoch:', currentEpoch, '→ Max epoch:', maxEpoch);

      // Generate ephemeral keypair
        const ephemeralKeypair = generateEphemeralKeypair();
        // keep the PublicKey object (do NOT call .toSuiBytes() here)
        const ephemeralPublicKeyObject = ephemeralKeypair.getPublicKey();

        // Generate randomness
        const randomness = generateZkLoginRandomness();

        // Generate nonce (pass PublicKey object)
        const nonce = generateZkLoginNonce(ephemeralPublicKeyObject, maxEpoch, randomness);

      // Store maxEpoch for later use
      sessionStorage.setItem('suipass_max_epoch', maxEpoch.toString());

      // Build Google OAuth URL
      const params = new URLSearchParams({
        client_id: ZKLOGIN_CONFIG.GOOGLE_CLIENT_ID,
        redirect_uri: ZKLOGIN_CONFIG.REDIRECT_URI,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce: nonce,
        prompt: 'select_account', // Always show account selection
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      console.log('🌐 Redirecting to Google OAuth...');
      console.log('📍 Redirect URI:', ZKLOGIN_CONFIG.REDIRECT_URI);

      // Redirect to Google OAuth
      window.location.href = authUrl;

    } catch (error) {
      console.error('❌ zkLogin initiation error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
    }
  }, [suiClient]);

  /**
   * Handle OAuth callback and complete zkLogin process
   */
  const handleOAuthCallback = useCallback(async (jwt: string) => {
  try {
    console.log('🔄 zkLogin callback');

    const decoded = decodeJWT(jwt);
    if (!decoded) throw new Error('Invalid JWT');

    const randomness = sessionStorage.getItem('suipass_randomness');
    const maxEpoch = Number(sessionStorage.getItem('suipass_max_epoch'));
    if (!randomness || !maxEpoch) throw new Error('Missing session data');

    /* ---------- 1. GET SALT (⚠️ FIELD NAME = token) ---------- */
    const saltRes = await fetch(
      'https://salt.api.mystenlabs.com/get_salt',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: jwt, // ❗❗❗ QUAN TRỌNG
        }),
      }
    );

    if (!saltRes.ok) {
      throw new Error(await saltRes.text());
    }

    const { salt } = await saltRes.json();

    /* ---------- 2. DERIVE ADDRESS ---------- */
    const address = jwtToAddress(jwt, salt);
    console.log('📍 Address:', address);

    /* ---------- 3. GET PROOF ---------- */
    const ephemeralKeypair = getEphemeralKeypair();
    if (!ephemeralKeypair) throw new Error('Missing ephemeral keypair');

    const proofRes = await fetch(
      'https://prover-dev.mystenlabs.com/v1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jwt,
          extendedEphemeralPublicKey: Array.from(
            ephemeralKeypair.getPublicKey().toSuiBytes()
          ),
          maxEpoch,
          jwtRandomness: randomness,
          salt,
          keyClaimName: 'sub',
        }),
      }
    );

    if (!proofRes.ok) {
      throw new Error(await proofRes.text());
    }

    const zkProof = await proofRes.json();

    /* ---------- 4. STORE SESSION ---------- */
    storeZkLoginSession({
      jwtToken: jwt,
      userSalt: salt,
      suiAddress: address,
      maxEpoch,
      zkProof,
      googleEmail: decoded.email,
    });

    setState({
      isAuthenticated: true,
      suiAddress: address,
      googleEmail: decoded.email,
      isLoading: false,
      error: null,
    });

    console.log('✅ zkLogin SUCCESS');
  } catch (e: any) {
    console.error(e);
    clearZkLoginSession();
    setState(s => ({
      ...s,
      isAuthenticated: false,
      error: e.message,
    }));
  }
}, []);


  /**
   * Logout and clear session
   */
  const logout = useCallback(() => {
    clearZkLoginSession();
    setState({
      isAuthenticated: false,
      suiAddress: null,
      googleEmail: null,
      isLoading: false,
      error: null,
    });
    console.log('👋 Logged out from zkLogin');
  }, []);

  /**
   * Get ZK signature for transaction signing
   */
  const getZkSignature = useCallback(async (userSignature: Uint8Array) => {
    try {
      const session = getZkLoginSession();
      if (!session || !session.zkProof) {
        throw new Error('No zkLogin session or proof available');
      }

      const ephemeralKeypair = getEphemeralKeypair();
      if (!ephemeralKeypair) {
        throw new Error('No ephemeral keypair found');
      }

      const ephemeralPublicKey = ephemeralKeypair.getPublicKey().toSuiBytes();

      // Generate address seed
      const decoded = decodeJWT(session.jwtToken);

        if (!decoded) throw new Error('Invalid JWT in session');

        const addressSeed = genAddressSeed(
        BigInt(session.userSalt),
        'sub',
        decoded.sub,
        decoded.aud
        );

      // Create zkLogin signature
      const zkLoginSignature = getZkLoginSignature({
        inputs: {
          ...session.zkProof,
          addressSeed: addressSeed.toString(),
        },
        maxEpoch: session.maxEpoch,
        userSignature,
      });

      return zkLoginSignature;

    } catch (error) {
      console.error('❌ Failed to generate ZK signature:', error);
      throw error;
    }
  }, []);

  return {
    ...state,
    loginWithGoogle,
    handleOAuthCallback,
    logout,
    getZkSignature,
  };
}

/**
 * Hook to get current zkLogin session data
 */
export function useZkLoginSession() {
  const [session, setSession] = useState(getZkLoginSession());

  useEffect(() => {
    const updateSession = () => {
      setSession(getZkLoginSession());
    };

    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', updateSession);

    // Poll for changes every 5 seconds (fallback)
    const interval = setInterval(updateSession, 5000);

    return () => {
      window.removeEventListener('storage', updateSession);
      clearInterval(interval);
    };
  }, []);

  return session;
}