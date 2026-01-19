// frontend/src/types/vault.ts file

export interface PasswordEntry {
  id: string;
  site: string;
  url: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultData {
  version: number;
  entries: PasswordEntry[];
  metadata: {
    totalEntries: number;
    lastBackup: number;
  };
}

export interface Vault {
  id: string;
  owner: string;
  walrusBlobId: string;
  sealPolicyId: string;
  entryCount: number;
  version: number;
}