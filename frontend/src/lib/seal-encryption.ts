// frontend/src/lib/seal-encryption.ts

import { SealClient } from '@mysten/seal';
import type { SuiClient } from '@mysten/sui/client';
import { 
  createSealClient, 
  generateEncryptionId,
  SUIPASS_PACKAGE_ID,
  SEAL_THRESHOLD 
} from './seal-config';

/**
 * Encrypt vault data using Seal
 * 
 * @param suiClient - Sui client instance
 * @param vaultId - Vault object ID (for encryption namespace)
 * @param data - Plaintext data to encrypt (VaultData as JSON string)
 * @returns Encrypted bytes (can be uploaded to Walrus)
 */
export async function encryptWithSeal(
  suiClient: SuiClient,
  vaultId: string,
  data: string
): Promise<Uint8Array> {
  console.log('🔐 [Seal] Starting encryption...');
  console.log('   Vault ID:', vaultId);
  console.log('   Data size:', data.length, 'bytes');
  
  try {
    // 1. Initialize Seal client
    const sealClient = createSealClient(suiClient);
    console.log('   ✓ Seal client initialized');
    
    // 2. Generate unique encryption ID (vault namespace + nonce)
    const encryptionId = generateEncryptionId(vaultId);
    
    // 3. Convert data to bytes
    const plaintext = new TextEncoder().encode(data);
    console.log('   ✓ Plaintext encoded:', plaintext.length, 'bytes');
    
    // 4. Encrypt using Seal
    const { encryptedObject } = await sealClient.encrypt({
      threshold: SEAL_THRESHOLD,
      packageId: SUIPASS_PACKAGE_ID,
      id: encryptionId,
      data: plaintext,
    });
    
    console.log('   ✅ Seal encryption successful!');
    console.log('   Encrypted size:', encryptedObject.length, 'bytes');
    
    return encryptedObject;
    
  } catch (error) {
    console.error('❌ [Seal] Encryption failed:', error);
    throw new Error(`Seal encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt vault data using Seal
 * 
 * @param suiClient - Sui client instance
 * @param vaultId - Vault object ID (for policy validation)
 * @param encryptedData - Encrypted bytes from Walrus
 * @param sessionKey - User's session key for authorization
 * @returns Decrypted plaintext (VaultData as JSON string)
 */
export async function decryptWithSeal(
  suiClient: SuiClient,
  vaultId: string,
  encryptedData: Uint8Array,
  sessionKey: any // SessionKey from @mysten/seal
): Promise<string> {
  console.log('🔓 [Seal] Starting decryption...');
  console.log('   Vault ID:', vaultId);
  console.log('   Encrypted size:', encryptedData.length, 'bytes');
  
  try {
    // 1. Initialize Seal client
    const sealClient = createSealClient(suiClient);
    console.log('   ✓ Seal client initialized');
    
    // 2. Construct transaction bytes for policy validation
    // This proves the user owns the vault
    const txBytes = await constructVaultAccessTx(suiClient, vaultId);
    console.log('   ✓ Access policy TX constructed');
    
    // 3. Decrypt using Seal
    const decryptedBytes = await sealClient.decrypt({
      data: encryptedData,
      sessionKey,
      txBytes,
    });
    
    console.log('   ✓ Seal decryption successful!');
    console.log('   Decrypted size:', decryptedBytes.length, 'bytes');
    
    // 4. Convert bytes back to string
    const plaintext = new TextDecoder().decode(decryptedBytes);
    
    console.log('   ✅ Decryption complete!');
    return plaintext;
    
  } catch (error) {
    console.error('❌ [Seal] Decryption failed:', error);
    throw new Error(`Seal decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Construct transaction bytes for vault access policy validation
 * This proves the user is the owner of the vault
 */
async function constructVaultAccessTx(
  suiClient: SuiClient,
  vaultId: string
): Promise<Uint8Array> {
  const { Transaction } = await import('@mysten/sui/transactions');
  
  const tx = new Transaction();
  
  // Call a read-only function on the vault to prove ownership
  // The Seal key servers will validate this transaction
  tx.moveCall({
    target: `${SUIPASS_PACKAGE_ID}::vault::owner`,
    arguments: [tx.object(vaultId)],
  });
  
  // Build transaction bytes (not executed, just for policy validation)
  const txBytes = await tx.build({ client: suiClient });
  
  return txBytes;
}