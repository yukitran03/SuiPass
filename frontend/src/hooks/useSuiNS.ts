// frontend/src/hooks/useSuiNS.ts

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { resolveSuiNS } from '@/lib/suins';

/**
 * React hook to resolve Sui address to SuiNS name
 * 
 * Usage:
 * const { name, isLoading } = useSuiNS(address);
 * 
 * Returns:
 * - name: "hung.sui" or null
 * - isLoading: boolean
 */
export function useSuiNS(address: string | undefined) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['suins', address],
    queryFn: async () => {
      if (!address) return null;
      return resolveSuiNS(client, address);
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if NS not found
  });
}

/**
 * Hook to display address with NS name
 * 
 * Usage:
 * const displayName = useSuiNSDisplay(address);
 * 
 * Returns:
 * - "hung.sui" if NS found
 * - "0x1234...5678" if NS not found
 * - "Loading..." while loading
 */
export function useSuiNSDisplay(address: string | undefined): string {
  const { data: name, isLoading } = useSuiNS(address);

  if (!address) return '';
  if (isLoading) return 'Loading...';
  if (name) return name;
  
  // Fallback: shortened address
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}