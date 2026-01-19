// frontend/src/hooks/useVault.ts

import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';
import { useNetworkVariable } from '@/lib/sui-config';
import { downloadFromWalrus, uploadToWalrus } from '@/lib/walrus';
import type { VaultData, PasswordEntry } from '@/types/vault';
import { encryptData, decryptData } from '@/lib/encryption';
import { nanoid } from 'nanoid';
import { syncPasswordsToExtension } from '@/lib/extension-sync';

/**
 * Convert blob ID from vector<u8> to string
 */
function blobIdToString(blobIdVec: number[] | Uint8Array | string): string {
  if (typeof blobIdVec === 'string') {
    return blobIdVec;
  }
  
  const bytes = blobIdVec instanceof Uint8Array ? blobIdVec : new Uint8Array(blobIdVec);
  return new TextDecoder().decode(bytes);
}

/**
 * Convert string blob ID to vector<u8> for Move
 */
function stringToBlobId(blobId: string): Uint8Array {
  return new TextEncoder().encode(blobId);
}

/**
 * Query user's vault from blockchain
 */
export function useVault() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const packageId = useNetworkVariable('packageId');

  return useQuery({
    queryKey: ['vault', account?.address],
    queryFn: async () => {
      if (!account) return null;

      console.log('🔍 Querying vaults for address:', account.address);

      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${packageId}::vault::Vault`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (objects.data.length === 0) {
        console.log('📭 No vaults found');
        return null;
      }

      console.log(`📦 Found ${objects.data.length} vault(s)`);

      // Get the most recent vault (highest version)
      const sorted = [...objects.data].sort((a, b) => {
        const contentA = a.data?.content as any;
        const contentB = b.data?.content as any;
        const versionA = BigInt(contentA?.fields?.version ?? 0);
        const versionB = BigInt(contentB?.fields?.version ?? 0);
        return versionB > versionA ? 1 : -1;
      });

      const vaultObj = sorted[0];
      const content = vaultObj.data?.content as any;
      
      if (!content?.fields) {
        console.error('❌ Invalid vault object structure');
        return null;
      }

      const fields = content.fields;
      
      const vault = {
        id: vaultObj.data?.objectId || '',
        owner: fields.owner,
        walrusBlobId: blobIdToString(fields.walrus_blob_id),
        sealPolicyId: blobIdToString(fields.seal_policy_id),
        entryCount: parseInt(fields.entry_count),
        version: parseInt(fields.version),
        createdAt: parseInt(fields.created_at),
        updatedAt: parseInt(fields.updated_at),
      };

      console.log('✅ Vault loaded:', vault);
      return vault;
    },
    enabled: !!account && !!packageId,
    refetchInterval: false,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch and decrypt vault data from Walrus
 */
export function useVaultData() {
  const account = useCurrentAccount();
  const { data: vault } = useVault();

  return useQuery({
    queryKey: ['vaultData', vault?.walrusBlobId, account?.address],
    queryFn: async (): Promise<VaultData> => {
      if (!vault || !account) {
        console.log('📝 No vault or account - returning empty vault data');
        return {
          version: 1,
          entries: [],
          metadata: { totalEntries: 0, lastBackup: Date.now() },
        };
      }

      try {
        console.log(`🔐 Fetching encrypted data from Walrus: ${vault.walrusBlobId}`);
        
        // Download encrypted blob from Walrus
        const encryptedBlob = await downloadFromWalrus(vault.walrusBlobId);
        const encryptedBase64 = new TextDecoder().decode(encryptedBlob);
        
        console.log('🔓 Decrypting vault data...');
        
        // Decrypt with user's address
        const decrypted = decryptData(encryptedBase64, account.address);
        const vaultData: VaultData = JSON.parse(decrypted);
        
        console.log(`✅ Decrypted ${vaultData.entries.length} password entries`);
        return vaultData;
      } catch (error) {
        console.error('❌ Error loading vault data:', error);
        
        // Try fallback to unencrypted data (for old vaults)
        try {
          console.log('🔄 Attempting fallback to unencrypted format...');
          const blob = await downloadFromWalrus(vault.walrusBlobId);
          const plaintext = new TextDecoder().decode(blob);
          const data: VaultData = JSON.parse(plaintext);
          console.log('⚠️ Loaded unencrypted vault (legacy format)');
          return data;
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          throw new Error('Cannot decrypt vault. Please create a new vault.');
        }
      }
    },
    enabled: !!vault && !!account,
    retry: false,
  });
}

/**
 * Create a new vault
 */
export function useCreateVault() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!account) throw new Error('No account connected');
      if (!packageId) throw new Error('Package ID not configured');

      console.log('🏗️ Creating new vault...');

      // Create initial empty vault data
      const initialData: VaultData = {
        version: 1,
        entries: [],
        metadata: { 
          totalEntries: 0, 
          lastBackup: Date.now() 
        },
      };

      const json = JSON.stringify(initialData);
      console.log('📝 Initial vault data:', json);

      // Encrypt before upload
      console.log('🔐 Encrypting vault data...');
      const encrypted = encryptData(json, account.address);
      const blob = new TextEncoder().encode(encrypted);

      // Upload to Walrus
      const blobId = await uploadToWalrus(blob);
      console.log(`☁️ Uploaded to Walrus: ${blobId}`);

      // Create vault on Sui
      const tx = new Transaction();
      
      const blobIdBytes = stringToBlobId(blobId);
      const policyIdBytes = stringToBlobId('nacl-encryption');

      tx.moveCall({
        target: `${packageId}::vault::create_and_keep_vault`,
        arguments: [
          tx.pure.vector('u8', Array.from(blobIdBytes)),
          tx.pure.vector('u8', Array.from(policyIdBytes)),
        ],
      });

      console.log('📤 Submitting transaction to Sui...');

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              console.log('✅ Vault created successfully!', result);
              queryClient.invalidateQueries({ queryKey: ['vault'] });
              resolve(result);
            },
            onError: (error) => {
              console.error('❌ Transaction failed:', error);
              reject(error);
            },
          }
        );
      });
    },
  });
}

/**
 * Add a password to the vault
 */
export function useAddPassword() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { data: vault } = useVault();
  const { data: vaultData } = useVaultData();

  return useMutation({
    mutationFn: async (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!account || !vault || !vaultData) {
        throw new Error('Vault not ready');
      }
      if (!packageId) {
        throw new Error('Package ID not configured');
      }

      console.log('➕ Adding new password entry...');

      // Create new entry
      const newEntry: PasswordEntry = {
        ...entry,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Update vault data
      const updatedData: VaultData = {
        ...vaultData,
        entries: [...vaultData.entries, newEntry],
        metadata: {
          totalEntries: vaultData.entries.length + 1,
          lastBackup: Date.now(),
        },
      };

      console.log(`📝 New entry count: ${updatedData.entries.length}`);

      // Encrypt updated data
      const json = JSON.stringify(updatedData);
      const encrypted = encryptData(json, account.address);
      const blob = new TextEncoder().encode(encrypted);

      // Upload to Walrus
      const newBlobId = await uploadToWalrus(blob);
      console.log(`☁️ Uploaded updated vault: ${newBlobId}`);

      // Update vault on Sui
      const tx = new Transaction();
      const blobIdBytes = stringToBlobId(newBlobId);

      tx.moveCall({
        target: `${packageId}::vault::update_vault`,
        arguments: [
          tx.object(vault.id),
          tx.pure.vector('u8', Array.from(blobIdBytes)),
          tx.pure.u64(updatedData.entries.length),
        ],
      });

      console.log('📤 Submitting update transaction...');

      return new Promise((resolve, reject) => {
  signAndExecute(
    { transaction: tx },
    {
      onSuccess: (result) => {
        console.log('✅ Password added successfully!');
        
        // Sync to extension TRƯỚC KHI invalidate queries
        console.log('📤 Syncing to extension...', updatedData.entries.length);
        syncPasswordsToExtension(updatedData.entries);
        
        // Invalidate queries sau khi sync
        queryClient.invalidateQueries({ queryKey: ['vault'] });
        queryClient.invalidateQueries({ queryKey: ['vaultData'] });
        
        resolve(result);
      },
      onError: (error) => {
        console.error('❌ Update transaction failed:', error);
        reject(error);
      },
    }
  );
});
    },
  });
}

/**
 * Update an existing password entry
 */
export function useUpdatePassword() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { data: vault } = useVault();
  const { data: vaultData } = useVaultData();

  return useMutation({
    mutationFn: async ({ 
      entryId, 
      updates 
    }: { 
      entryId: string; 
      updates: Partial<Omit<PasswordEntry, 'id' | 'createdAt'>> 
    }) => {
      if (!account || !vault || !vaultData) {
        throw new Error('Vault not ready');
      }
      if (!packageId) {
        throw new Error('Package ID not configured');
      }

      console.log(`✏️ Updating password entry: ${entryId}`);

      // Find and update entry
      const updatedEntries = vaultData.entries.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            ...updates,
            updatedAt: Date.now(),
          };
        }
        return entry;
      });

      const updatedData: VaultData = {
        ...vaultData,
        entries: updatedEntries,
        metadata: {
          ...vaultData.metadata,
          lastBackup: Date.now(),
        },
      };

      // Encrypt and upload
      const json = JSON.stringify(updatedData);
      const encrypted = encryptData(json, account.address);
      const blob = new TextEncoder().encode(encrypted);
      const newBlobId = await uploadToWalrus(blob);

      console.log(`☁️ Uploaded updated vault: ${newBlobId}`);

      // Update on Sui
      const tx = new Transaction();
      const blobIdBytes = stringToBlobId(newBlobId);

      tx.moveCall({
        target: `${packageId}::vault::update_vault`,
        arguments: [
          tx.object(vault.id),
          tx.pure.vector('u8', Array.from(blobIdBytes)),
          tx.pure.u64(updatedData.entries.length),
        ],
      });

      return new Promise((resolve, reject) => {
  signAndExecute(
    { transaction: tx },
    {
      onSuccess: (result) => {
        console.log('✅ Password updated successfully!');
        
        // Sync to extension với updated data
        console.log('📤 Syncing to extension...');
        syncPasswordsToExtension(updatedData.entries);
        
        queryClient.invalidateQueries({ queryKey: ['vault'] });
        queryClient.invalidateQueries({ queryKey: ['vaultData'] });
        
        resolve(result);
      },
      onError: reject,
    }
  );
});
    },
  });
}

/**
 * Delete a single password entry
 */
export function useDeletePassword() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { data: vault } = useVault();
  const { data: vaultData } = useVaultData();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!account || !vault || !vaultData) {
        throw new Error('Vault not ready');
      }
      if (!packageId) {
        throw new Error('Package ID not configured');
      }

      console.log(`🗑️ Deleting password entry: ${entryId}`);

      // Remove entry
      const updatedEntries = vaultData.entries.filter(e => e.id !== entryId);

      const updatedData: VaultData = {
        ...vaultData,
        entries: updatedEntries,
        metadata: {
          totalEntries: updatedEntries.length,
          lastBackup: Date.now(),
        },
      };

      // Encrypt and upload
      const json = JSON.stringify(updatedData);
      const encrypted = encryptData(json, account.address);
      const blob = new TextEncoder().encode(encrypted);
      const newBlobId = await uploadToWalrus(blob);

      console.log(`☁️ Uploaded updated vault: ${newBlobId}`);

      // Update on Sui
      const tx = new Transaction();
      const blobIdBytes = stringToBlobId(newBlobId);

      tx.moveCall({
        target: `${packageId}::vault::update_vault`,
        arguments: [
          tx.object(vault.id),
          tx.pure.vector('u8', Array.from(blobIdBytes)),
          tx.pure.u64(updatedData.entries.length),
        ],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
                console.log('✅ Password deleted successfully!');
                
                // Sync to extension
                syncPasswordsToExtension(updatedData.entries);
                
                queryClient.invalidateQueries({ queryKey: ['vault'] });
                queryClient.invalidateQueries({ queryKey: ['vaultData'] });
                
                resolve(result);
                },
            onError: reject,
          }
        );
      });
    },
  });
}

/**
 * Delete multiple password entries at once
 */
export function useDeletePasswords() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { data: vault } = useVault();
  const { data: vaultData } = useVaultData();

  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      if (!account || !vault || !vaultData) {
        throw new Error('Vault not ready');
      }
      if (!packageId) {
        throw new Error('Package ID not configured');
      }

      console.log(`🗑️ Deleting ${entryIds.length} password entries...`);

      // Remove entries
      const updatedEntries = vaultData.entries.filter(e => !entryIds.includes(e.id));

      const updatedData: VaultData = {
        ...vaultData,
        entries: updatedEntries,
        metadata: {
          totalEntries: updatedEntries.length,
          lastBackup: Date.now(),
        },
      };

      // Encrypt and upload
      const json = JSON.stringify(updatedData);
      const encrypted = encryptData(json, account.address);
      const blob = new TextEncoder().encode(encrypted);
      const newBlobId = await uploadToWalrus(blob);

      // Update on Sui
      const tx = new Transaction();
      const blobIdBytes = stringToBlobId(newBlobId);

      tx.moveCall({
        target: `${packageId}::vault::update_vault`,
        arguments: [
          tx.object(vault.id),
          tx.pure.vector('u8', Array.from(blobIdBytes)),
          tx.pure.u64(updatedData.entries.length),
        ],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
                console.log('✅ Passwords deleted successfully!');
                
                // Sync to extension
                syncPasswordsToExtension(updatedData.entries);
                
                queryClient.invalidateQueries({ queryKey: ['vault'] });
                queryClient.invalidateQueries({ queryKey: ['vaultData'] });
                
                resolve(result);
                },
            onError: reject,
          }
        );
      });
    },
  });
}

/**
 * Delete entire vault
 */
export function useDeleteVault() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { data: vault } = useVault();

  return useMutation({
    mutationFn: async () => {
      if (!account || !vault) {
        throw new Error('No vault to delete');
      }
      if (!packageId) {
        throw new Error('Package ID not configured');
      }

      console.log(`🗑️ Deleting entire vault: ${vault.id}`);

      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::vault::destroy_vault`,
        arguments: [tx.object(vault.id)],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              console.log('✅ Vault deleted successfully!');
              queryClient.invalidateQueries({ queryKey: ['vault'] });
              queryClient.invalidateQueries({ queryKey: ['vaultData'] });
              resolve(result);
            },
            onError: reject,
          }
        );
      });
    },
  });
}