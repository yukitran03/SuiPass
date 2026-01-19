// frontend/src/lib/encryption.ts
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * Derive a deterministic encryption key from the user's Sui address
 * This ensures the same user always gets the same encryption key
 */
function deriveKeyFromAddress(address: string): Uint8Array {
  // Create a stable 32-byte key from the address
  const encoder = new TextEncoder();
  const addressBytes = encoder.encode(address);
  
  // Use a simple hash-like derivation (in production, use proper KDF)
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    // Mix address bytes to fill 32 bytes
    key[i] = addressBytes[i % addressBytes.length] ^ (i * 7);
  }
  
  return key;
}

/**
 * Encrypt data using NaCl secretbox
 * Returns base64-encoded encrypted data
 */
export function encryptData(plaintext: string, userAddress: string): string {
  try {
    const key = deriveKeyFromAddress(userAddress);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    
    // Encode plaintext to Uint8Array
    const encoder = new TextEncoder();
    const messageUint8 = encoder.encode(plaintext);
    
    // Encrypt
    const encrypted = nacl.secretbox(messageUint8, nonce, key);
    
    // Combine nonce + encrypted data
    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);
    
    // Return as base64 string
    return encodeBase64(fullMessage);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt data: ${error}`);
  }
}

/**
 * Decrypt data using NaCl secretbox
 * Takes base64-encoded encrypted data, returns plaintext
 */
export function decryptData(encryptedBase64: string, userAddress: string): string {
  try {
    const key = deriveKeyFromAddress(userAddress);
    
    // Decode from base64
    const fullMessage = decodeBase64(encryptedBase64);
    
    // Extract nonce and encrypted message
    const nonce = fullMessage.slice(0, nacl.secretbox.nonceLength);
    const message = fullMessage.slice(nacl.secretbox.nonceLength);
    
    // Decrypt
    const decrypted = nacl.secretbox.open(message, nonce, key);
    
    if (!decrypted) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
    
    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt data: ${error}`);
  }
}

/**
 * Test encryption/decryption
 */
export function testEncryption() {
  const testData = JSON.stringify({ test: 'Hello, SuiPass!' });
  const testAddress = '0x1234567890abcdef';
  
  console.log('Original:', testData);
  
  const encrypted = encryptData(testData, testAddress);
  console.log('Encrypted (base64):', encrypted);
  
  const decrypted = decryptData(encrypted, testAddress);
  console.log('Decrypted:', decrypted);
  
  if (testData === decrypted) {
    console.log('✅ Encryption test PASSED');
    return true;
  } else {
    console.error('❌ Encryption test FAILED');
    return false;
  }
}
