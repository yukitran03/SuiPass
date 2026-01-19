// frontend/src/components/OAuthCallback.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZkLogin } from '@/hooks/useZkLogin';

/**
 * OAuth callback handler component
 * This handles the redirect from Google OAuth and completes zkLogin
 */
export function OAuthCallback() {
  const navigate = useNavigate();
  const { handleOAuthCallback } = useZkLogin();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        setStatus('processing');

        // Get JWT token from URL hash (Google OAuth uses hash fragment)
        const hash = window.location.hash;
        console.log('📍 Callback URL hash:', hash);

        if (!hash) {
          throw new Error('No hash fragment in callback URL');
        }

        // Parse hash parameters
        const params = new URLSearchParams(hash.substring(1)); // Remove '#'
        const idToken = params.get('id_token');

        if (!idToken) {
          // Check for error in callback
          const error = params.get('error');
          const errorDescription = params.get('error_description');
          
          if (error) {
            throw new Error(errorDescription || error);
          }
          
          throw new Error('No JWT token found in callback URL');
        }

        console.log('🎫 JWT token received (length:', idToken.length, ')');

        // Process the JWT token and complete zkLogin
        await handleOAuthCallback(idToken);

        setStatus('success');
        console.log('✅ Callback processed successfully');

        // Redirect to main app after brief delay
        setTimeout(() => {
          navigate('/');
        }, 1500);

      } catch (error) {
        console.error('❌ Callback processing error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');

        // Redirect to home with error after delay
        setTimeout(() => {
          navigate('/?error=oauth_failed');
        }, 3000);
      }
    };

    processCallback();
  }, [handleOAuthCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Completing sign in...</h2>
              <div className="space-y-2 text-sm opacity-70">
                <p>🔐 Verifying your Google account</p>
                <p>🧂 Requesting user salt</p>
                <p>📍 Deriving Sui address</p>
                <p>🔑 Generating ZK proof</p>
              </div>
              <p className="mt-4 text-xs opacity-50">
                This may take 10-30 seconds...
              </p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Sign in successful!</h2>
              <p className="opacity-70">Redirecting to your vault...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Sign in failed</h2>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-left">
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
              <p className="mt-4 text-sm opacity-70">
                Redirecting back to home...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}