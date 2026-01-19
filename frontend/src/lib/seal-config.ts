// frontend/src/lib/seal-config.ts

import { SealClient } from '@mysten/seal';
import type { SuiClient } from '@mysten/sui/client';

/**
 * SEAL Configuration for SuiPass Password Manager
 * Using Mysten Labs Testnet Key Servers
 */

// Testnet Key Server Object IDs (from Mist Protocol - verified working)
export const SEAL_KEY_SERVERS = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
];

// Public Keys for Key Servers (BLS12-381)
export const SEAL_PUBLIC_KEYS = [
  '0xa040b5548bb0428fba159895c07080cbfdc76ef01bb88ca2ced5c85b07782e09970a1f5684e2a0dd3d3e31beb6cbd7ea02c49a3794b26c6d3d9ffdc99e4984cc981d0d72e933c2af3309216bf7011e9e82c7b68276882f18ba0ea7f45a7721db',
  '0xa8cb6f59027d14e0a3e97ea1bd79aa6a942f36ffc835f5025591c680d598a5541f087facb39fb12a1d9d71b3a510942b1760e5f6685f86660a4c38b178928bb6d0362a6c7e244985527832c783a8b5195db743ff2289de3b23226dad86cd70f1',
];

// Your deployed SuiPass package ID
export const SUIPASS_PACKAGE_ID = '0x155ce44650893d0118358ef4000c00e8bef76a0e72e0ba59d7c4d66c6a4b26bc';

// Threshold: need 2 out of 2 key servers
export const SEAL_THRESHOLD = 2;

/**
 * Initialize Seal client
 */
export function createSealClient(suiClient: SuiClient): SealClient {
  return new SealClient({
    suiClient,
    serverConfigs: SEAL_KEY_SERVERS.map(id => ({ objectId: id })),
    verifyKeyServers: true,
  });
}

/**
 * Generate encryption ID for vault data
 * Pattern: vaultId (32 bytes) + random nonce (5 bytes) = 37 bytes total
 */
export function generateEncryptionId(vaultId: string): string {
  // Remove 0x prefix
  const vaultBytes = vaultId.replace('0x', '');
  
  // Generate 5-byte random nonce (matching Mist pattern)
  const nonce = new Uint8Array(5);
  crypto.getRandomValues(nonce);
  const nonceHex = Array.from(nonce)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Combine: vault (64 hex chars) + nonce (10 hex chars) = 74 hex chars = 37 bytes
  const encryptionId = `0x${vaultBytes}${nonceHex}`;
  
  console.log('🔐 Seal Encryption ID:', encryptionId);
  console.log('📊 Length:', encryptionId.length, 'hex chars (37 bytes)');
  
  return encryptionId;
}