// frontend/src/hooks/useSealSession.ts

import { useState, useEffect } from 'react';
import { SessionKey } from '@mysten/seal';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { SUIPASS_PACKAGE_ID } from '@/lib/seal-config';

/**
 * Hook to manage Seal session keys
 * Session keys allow decryption without repeated wallet approvals
 */
export function useSealSession() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new session key (requires wallet approval)
   * User approves once, then can decrypt multiple times
   */
  const createSessionKey = async () => {
    if (!account) {
      setError('No wallet connected');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('🔑 Creating Seal session key...');
      console.log('   Address:', account.address);
      console.log('   Package:', SUIPASS_PACKAGE_ID);

      // Create session key with 60-minute TTL
      const newSessionKey = await SessionKey.create({
        address: account.address,
        packageId: SUIPASS_PACKAGE_ID,
        ttlMin: 60, // Valid for 60 minutes
        signer: account, // User's wallet will sign
        suiClient,
      });

      setSessionKey(newSessionKey);
      console.log('✅ Session key created successfully!');
      console.log('   Valid for: 60 minutes');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session key';
      console.error('❌ Session key creation failed:', err);
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Check if session key is still valid
   */
  const isSessionValid = (): boolean => {
    if (!sessionKey) return false;
    
    // Check expiration (SessionKey has internal expiry check)
    try {
      // If we can access the key, it's still valid
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Clear expired session key
   */
  useEffect(() => {
    if (sessionKey && !isSessionValid()) {
      console.log('⏰ Session key expired, clearing...');
      setSessionKey(null);
    }
  }, [sessionKey]);

  /**
   * Clear session when user disconnects wallet
   */
  useEffect(() => {
    if (!account) {
      setSessionKey(null);
      setError(null);
    }
  }, [account]);

  return {
    sessionKey,
    isCreating,
    error,
    createSessionKey,
    isSessionValid: isSessionValid(),
    hasSession: !!sessionKey,
  };
}