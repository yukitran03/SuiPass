// frontend/src/lib/suins.ts - WITH FULL DEBUG LOGS

import { SuiClient } from '@mysten/sui/client';

/**
 * Cache for NS lookups (to reduce RPC calls)
 */
const nsCache = new Map<string, { name: string | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve Sui address to SuiNS name using Sui RPC
 * Returns name like "hung.sui" or null if not found
 */
export async function resolveSuiNS(
  client: SuiClient,
  address: string
): Promise<string | null> {
  console.log('🔍 [SuiNS] Starting resolution for address:', address);
  
  try {
    // Check cache first
    const cached = nsCache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ [SuiNS] Found in cache:', cached.name);
      return cached.name;
    }

    console.log('📡 [SuiNS] Cache miss, querying RPC...');

    // Use Sui RPC's suix_resolveNameServiceNames method
    const response = await (client as any).call('suix_resolveNameServiceNames', [
      address
    ]);

    console.log('📥 [SuiNS] RPC Response:', JSON.stringify(response, null, 2));

    if (response && response.data && response.data.length > 0) {
      const name = response.data[0];
      console.log('✅ [SuiNS] Resolved to:', name);
      
      // Cache result
      nsCache.set(address, { name, timestamp: Date.now() });
      return name;
    }

    // Not found
    console.log('⚠️ [SuiNS] No name found for address');
    nsCache.set(address, { name: null, timestamp: Date.now() });
    return null;
    
  } catch (error) {
    console.error('❌ [SuiNS] Error:', error);
    console.error('❌ [SuiNS] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    
    // Cache null result to avoid repeated failed lookups
    nsCache.set(address, { name: null, timestamp: Date.now() });
    return null;
  }
}

/**
 * Reverse lookup: Get address from SuiNS name
 * Input: "hung.sui" or "hung"
 * Returns: "0x..." or null
 */
export async function getAddressFromNS(
  client: SuiClient,
  name: string
): Promise<string | null> {
  console.log('🔍 [SuiNS] Reverse lookup for name:', name);
  
  try {
    // Remove .sui suffix if present
    const cleanName = name.replace(/\.sui$/i, '');
    console.log('📝 [SuiNS] Clean name:', cleanName);

    // Use Sui RPC's suix_resolveNameServiceAddress method
    const response = await (client as any).call('suix_resolveNameServiceAddress', [
      cleanName
    ]);

    console.log('📥 [SuiNS] Reverse lookup response:', JSON.stringify(response, null, 2));

    if (response) {
      console.log('✅ [SuiNS] Found address:', response);
      return response;
    }

    console.log('⚠️ [SuiNS] No address found for name');
    return null;
    
  } catch (error) {
    console.error('❌ [SuiNS] Reverse lookup error:', error);
    return null;
  }
}

/**
 * Format address with NS name
 * Returns: "hung.sui (0x1234...5678)" or "0x1234...5678"
 */
export function formatAddressWithNS(
  address: string,
  nsName: string | null
): string {
  const shortened = shortenAddress(address);
  
  if (nsName) {
    return `${nsName} (${shortened})`;
  }
  
  return shortened;
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Clear NS cache (useful for testing)
 */
export function clearNSCache(): void {
  nsCache.clear();
  console.log('🗑️ [SuiNS] Cache cleared');
}