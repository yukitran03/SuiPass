# SuiPass - 6-Day Implementation Plan

---

## Pre-Development Setup (Before Day 1)

### Environment Verification

```bash
# Verify your setup matches requirements
node -v           # Should show v18.20.4 ✅
sui client --version  # Should show 1.63.1-a14d9e8ddadf ✅

# Configure Sui for testnet
sui client active-env
# Should show: testnet

# Check active address
sui client active-address

# Get test tokens
sui client faucet
```

### Repository Initialization

```bash
# Create project directory
mkdir suipass && cd suipass

# Initialize git
git init
git checkout -b main

# Create directory structure
mkdir -p {contracts,frontend,extension,docs,scripts}

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
dist/
build/
*.log
.DS_Store
.sui/
EOF

# Initial commit
git add .
git commit -m "chore: initial project structure"
```

---

## Day 1: Smart Contracts + Project Foundation

**Duration:** 8 hours  
**Goal:** Deploy working smart contract to testnet + setup frontend skeleton

### Morning Session (4 hours): Smart Contract Development

**Hour 1: Setup Sui Move Project**

```bash
cd contracts
sui move new suipass_vault

# Structure:
# contracts/suipass_vault/
# ├── Move.toml
# └── sources/
#     └── vault.move
```

**Move.toml Configuration:**

```toml
[package]
name = "suipass_vault"
edition = "2024.beta"
version = "1.0.0"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
suipass = "0x0"
```

**Hour 2-3: Write vault.move**

Create `sources/vault.move`:

```move
module suipass::vault;

use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::event;

// Error codes
const ENotOwner: u64 = 0;
const EInvalidBlobId: u64 = 1;

/// User's password vault metadata stored on-chain
public struct Vault has key, store {
    id: UID,
    owner: address,
    walrus_blob_id: vector<u8>,
    seal_policy_id: vector<u8>,
    entry_count: u64,
    created_at: u64,
    updated_at: u64,
    version: u64,
}

/// Event emitted when vault is created
public struct VaultCreated has copy, drop {
    vault_id: ID,
    owner: address,
    created_at: u64,
}

/// Event emitted when vault is updated  
public struct VaultUpdated has copy, drop {
    vault_id: ID,
    new_blob_id: vector<u8>,
    entry_count: u64,
    version: u64,
}

/// Create a new vault for the user
public fun create_vault(
    walrus_blob_id: vector<u8>,
    seal_policy_id: vector<u8>,
    ctx: &mut TxContext
): Vault {
    assert!(walrus_blob_id.length() > 0, EInvalidBlobId);
    
    let sender = ctx.sender();
    let current_epoch = ctx.epoch();
    
    let vault = Vault {
        id: object::new(ctx),
        owner: sender,
        walrus_blob_id,
        seal_policy_id,
        entry_count: 0,
        created_at: current_epoch,
        updated_at: current_epoch,
        version: 1,
    };

    event::emit(VaultCreated {
        vault_id: object::id(&vault),
        owner: sender,
        created_at: current_epoch,
    });

    vault
}

/// Create vault and transfer to sender (entry function)
entry fun create_and_keep_vault(
    walrus_blob_id: vector<u8>,
    seal_policy_id: vector<u8>,
    ctx: &mut TxContext
) {
    let vault = create_vault(walrus_blob_id, seal_policy_id, ctx);
    transfer::transfer(vault, ctx.sender());
}

/// Update vault with new encrypted blob
public fun update_vault(
    vault: &mut Vault,
    new_blob_id: vector<u8>,
    new_entry_count: u64,
    ctx: &mut TxContext
) {
    assert!(vault.owner == ctx.sender(), ENotOwner);
    assert!(new_blob_id.length() > 0, EInvalidBlobId);
    
    vault.walrus_blob_id = new_blob_id;
    vault.entry_count = new_entry_count;
    vault.updated_at = ctx.epoch();
    vault.version = vault.version + 1;

    event::emit(VaultUpdated {
        vault_id: object::id(vault),
        new_blob_id,
        entry_count: new_entry_count,
        version: vault.version,
    });
}

/// Delete vault permanently
entry fun destroy_vault(vault: Vault) {
    let Vault { id, .. } = vault;
    id.delete();
}

// === Getter Functions ===

public fun owner(vault: &Vault): address { vault.owner }
public fun walrus_blob_id(vault: &Vault): vector<u8> { vault.walrus_blob_id }
public fun seal_policy_id(vault: &Vault): vector<u8> { vault.seal_policy_id }
public fun entry_count(vault: &Vault): u64 { vault.entry_count }
public fun version(vault: &Vault): u64 { vault.version }
public fun created_at(vault: &Vault): u64 { vault.created_at }
public fun updated_at(vault: &Vault): u64 { vault.updated_at }

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    // Test initialization if needed
}
```

**Hour 4: Test & Deploy**

```bash
# Build the contract
cd contracts/suipass_vault
sui move build

# Run tests
sui move test

# Deploy to testnet
sui client publish --gas-budget 100000000

# ✅ SAVE THIS OUTPUT:
# Package ID: 0x...
# Vault Module: 0x...::vault
# 
# Save to: docs/DEPLOYED_ADDRESSES.md
```

**Save Deployment Info:**

```bash
cat > ../../docs/DEPLOYED_ADDRESSES.md << 'EOF'
# Deployed Contract Addresses

## Testnet Deployment (Jan 14, 2026)

**Package ID:** `0xYOUR_PACKAGE_ID_HERE`  
**Module:** `suipass::vault`

### Functions:
- `create_and_keep_vault(walrus_blob_id, seal_policy_id)`
- `update_vault(vault, new_blob_id, new_entry_count)`
- `destroy_vault(vault)`

### Events:
- `VaultCreated { vault_id, owner, created_at }`
- `VaultUpdated { vault_id, new_blob_id, entry_count, version }`

**Deployment Transaction:**  
`https://suiscan.xyz/testnet/tx/YOUR_TX_DIGEST`

**Explorer Link:**  
`https://suiscan.xyz/testnet/object/YOUR_PACKAGE_ID`
EOF
```

### Afternoon Session (4 hours): Frontend Setup

**Hour 1: Initialize React Project**

```bash
cd ../../frontend

# Create Vite project with React + TypeScript
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install Sui dependencies
npm install @mysten/sui @mysten/dapp-kit @mysten/zklogin @tanstack/react-query

# Install UI dependencies
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install shadcn/ui
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast

# Install utilities
npm install zustand nanoid date-fns
```

**Hour 2: Configure Tailwind + Setup**

`tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 26% 8%;
    --foreground: 220 13% 91%;
    --primary: 210 100% 63%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 20% 18%;
    --secondary-foreground: 0 0% 100%;
    --accent: 187 100% 50%;
    --accent-foreground: 0 0% 0%;
    --muted: 220 15% 25%;
    --muted-foreground: 220 13% 65%;
    --border: 220 20% 28%;
    --input: 220 20% 28%;
    --ring: 210 100% 63%;
    --radius: 0.75rem;
  }
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

**Hour 3: Setup Sui Client**

`src/lib/sui/config.ts`:

```typescript
import { getFullnodeUrl } from '@mysten/sui/client';
import { createNetworkConfig } from '@mysten/dapp-kit';

const { networkConfig, useNetworkVariable } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
    variables: {
      packageId: '0xYOUR_PACKAGE_ID', // Replace with deployed package ID
      vaultModule: 'vault',
    },
  },
});

export { networkConfig, useNetworkVariable };
```

`src/App.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { networkConfig } from './lib/sui/config';
import '@mysten/dapp-kit/dist/index.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <div className="min-h-screen bg-background text-foreground">
            <h1 className="text-4xl font-bold text-center py-20">
              SuiPass - Coming Soon
            </h1>
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
```

**Hour 4: Test Local Development**

```bash
# Start dev server
npm run dev

# Should open http://localhost:5173
# Verify: "SuiPass - Coming Soon" displays with dark theme
```

**✅ Day 1 Checklist:**
- [x] Smart contract written and tested
- [x] Contract deployed to testnet
- [x] Package ID saved to docs
- [x] Frontend project initialized
- [x] Dependencies installed
- [x] Tailwind configured with Sui colors
- [x] Sui client configured
- [x] Dev server running

**Commit & Push:**

```bash
git add .
git commit -m "feat: Day 1 - smart contract + frontend setup"
git push origin main
```

---

## Day 2: Walrus Integration + Basic Vault CRUD

**Duration:** 8 hours  
**Goal:** Upload/download encrypted blobs to Walrus + create vault on-chain

### Morning Session (4 hours): Walrus Integration

**Hour 1: Walrus Client Setup**

`src/lib/walrus/client.ts`:

```typescript
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';

export interface WalrusUploadResponse {
  newlyCreated: {
    blobObject: {
      id: string;
      storedEpoch: number;
      blobId: string;
      size: number;
      erasureCodeType: string;
      certifiedEpoch: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      };
    };
    resourceOperation: {
      RegisterFromScratch: {
        encoded_length: number;
        epochs_ahead: number;
      };
    };
  };
  cost: number;
}

export async function uploadToWalrus(data: Uint8Array): Promise<string> {
  const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/store`, {
    method: 'PUT',
    body: data,
  });

  if (!response.ok) {
    throw new Error(`Walrus upload failed: ${response.statusText}`);
  }

  const result: WalrusUploadResponse = await response.json();
  return result.newlyCreated.blobObject.blobId;
}

export async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/${blobId}`);

  if (!response.ok) {
    throw new Error(`Walrus download failed: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
```

**Hour 2: Data Types & Models**

`src/types/vault.ts`:

```typescript
export interface PasswordEntry {
  id: string;
  site: string;
  url: string;
  username: string;
  password: string;
  notes?: string;
  tags?: string[];
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
  createdAt: number;
  updatedAt: number;
  version: number;
}
```

**Hour 3-4: Vault Transactions**

`src/lib/sui/transactions.ts`:

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

export function buildCreateVaultTx(
  packageId: string,
  walrusBlobId: string,
  sealPolicyId: string
): Transaction {
  const tx = new Transaction();

  // Convert string to vector<u8>
  const blobIdBytes = Array.from(Buffer.from(walrusBlobId, 'utf-8'));
  const policyIdBytes = Array.from(Buffer.from(sealPolicyId, 'utf-8'));

  tx.moveCall({
    target: `${packageId}::vault::create_and_keep_vault`,
    arguments: [
      tx.pure.vector('u8', blobIdBytes),
      tx.pure.vector('u8', policyIdBytes),
    ],
  });

  return tx;
}

export function buildUpdateVaultTx(
  packageId: string,
  vaultId: string,
  newBlobId: string,
  entryCount: number
): Transaction {
  const tx = new Transaction();

  const blobIdBytes = Array.from(Buffer.from(newBlobId, 'utf-8'));

  tx.moveCall({
    target: `${packageId}::vault::update_vault`,
    arguments: [
      tx.object(vaultId),
      tx.pure.vector('u8', blobIdBytes),
      tx.pure.u64(entryCount),
    ],
  });

  return tx;
}

export async function queryUserVault(
  client: SuiClient,
  userAddress: string,
  packageId: string
): Promise<Vault | null> {
  const objects = await client.getOwnedObjects({
    owner: userAddress,
    filter: {
      StructType: `${packageId}::vault::Vault`,
    },
    options: {
      showContent: true,
      showType: true,
    },
  });

  if (objects.data.length === 0) return null;

  const vaultObject = objects.data[0];
  const content = vaultObject.data?.content as any;

  return {
    id: vaultObject.data?.objectId || '',
    owner: content.fields.owner,
    walrusBlobId: Buffer.from(content.fields.walrus_blob_id).toString('utf-8'),
    sealPolicyId: Buffer.from(content.fields.seal_policy_id).toString('utf-8'),
    entryCount: parseInt(content.fields.entry_count),
    createdAt: parseInt(content.fields.created_at),
    updatedAt: parseInt(content.fields.updated_at),
    version: parseInt(content.fields.version),
  };
}
```

### Afternoon Session (4 hours): Vault Hooks & Basic UI

**Hour 1: React Query Hooks**

`src/hooks/useVault.ts`:

```typescript
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNetworkVariable } from '@/lib/sui/config';
import { buildCreateVaultTx, buildUpdateVaultTx, queryUserVault } from '@/lib/sui/transactions';
import { uploadToWalrus, downloadFromWalrus } from '@/lib/walrus/client';
import { VaultData, PasswordEntry } from '@/types/vault';
import { nanoid } from 'nanoid';

export function useVault() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const packageId = useNetworkVariable('packageId');

  return useQuery({
    queryKey: ['vault', account?.address],
    queryFn: async () => {
      if (!account) return null;
      return queryUserVault(client, account.address, packageId);
    },
    enabled: !!account,
  });
}

export function useVaultData() {
  const { data: vault } = useVault();

  return useQuery({
    queryKey: ['vaultData', vault?.walrusBlobId],
    queryFn: async (): Promise<VaultData> => {
      if (!vault?.walrusBlobId) {
        return {
          version: 1,
          entries: [],
          metadata: { totalEntries: 0, lastBackup: Date.now() },
        };
      }

      // Download from Walrus
      const encryptedBlob = await downloadFromWalrus(vault.walrusBlobId);
      
      // TODO: Decrypt with Seal (Day 3)
      // For now, assume plain text
      const json = new TextDecoder().decode(encryptedBlob);
      return JSON.parse(json);
    },
    enabled: !!vault,
  });
}

export function useCreateVault() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!account) throw new Error('No account connected');

      // Create initial empty vault data
      const initialData: VaultData = {
        version: 1,
        entries: [],
        metadata: { totalEntries: 0, lastBackup: Date.now() },
      };

      // Upload to Walrus (unencrypted for now)
      const json = JSON.stringify(initialData);
      const blob = new TextEncoder().encode(json);
      const blobId = await uploadToWalrus(blob);

      // Create vault on-chain
      const tx = buildCreateVaultTx(packageId, blobId, 'temp-seal-policy');

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              queryClient.invalidateQueries({ queryKey: ['vault'] });
              resolve(result);
            },
            onError: reject,
          }
        );
      });
    },
  });
}

export function useAddPassword() {
  const { data: vault } = useVault();
  const { data: vaultData } = useVaultData();
  const packageId = useNetworkVariable('packageId');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!vault || !vaultData) throw new Error('No vault found');

      // Add new entry
      const newEntry: PasswordEntry = {
        ...entry,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updatedData: VaultData = {
        ...vaultData,
        entries: [...vaultData.entries, newEntry],
        metadata: {
          totalEntries: vaultData.entries.length + 1,
          lastBackup: Date.now(),
        },
      };

      // Upload updated data
      const json = JSON.stringify(updatedData);
      const blob = new TextEncoder().encode(json);
      const newBlobId = await uploadToWalrus(blob);

      // Update vault on-chain
      const tx = buildUpdateVaultTx(
        packageId,
        vault.id,
        newBlobId,
        updatedData.entries.length
      );

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
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
```

**Hour 2-4: Basic UI Components**

`src/components/Dashboard.tsx`:

```typescript
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { useVault, useVaultData, useCreateVault } from '@/hooks/useVault';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const account = useCurrentAccount();
  const { data: vault, isLoading: vaultLoading } = useVault();
  const { data: vaultData } = useVaultData();
  const createVault = useCreateVault();

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-4xl font-bold">Welcome to SuiPass</h1>
        <p className="text-muted-foreground">Connect your wallet to get started</p>
        <ConnectButton />
      </div>
    );
  }

  if (vaultLoading) {
    return <div>Loading vault...</div>;
  }

  if (!vault) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-3xl font-bold">Create Your Vault</h2>
        <p className="text-muted-foreground">Secure your passwords on Sui</p>
        <Button onClick={() => createVault.mutate()}>
          Create Vault
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Your Passwords</h1>
      <div className="bg-secondary rounded-lg p-6">
        <p>Total passwords: {vaultData?.entries.length || 0}</p>
        <pre className="mt-4 text-xs overflow-auto">
          {JSON.stringify(vaultData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
```

Update `src/App.tsx`:

```typescript
import { Dashboard } from './components/Dashboard';
// ... other imports

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <Dashboard />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
```

**✅ Day 2 Checklist:**
- [x] Walrus client implemented
- [x] Upload/download functions working
- [x] Vault transaction builders complete
- [x] React Query hooks for vault CRUD
- [x] Basic dashboard UI
- [x] Can create vault and see data

**Test:**

```bash
npm run dev
# 1. Connect wallet
# 2. Create vault
# 3. Check Suiscan for vault object
# 4. Verify vault appears in UI
```

**Commit:**

```bash
git add .
git commit -m "feat: Day 2 - Walrus integration + vault CRUD"
```

---

## Day 3: Seal Encryption Integration

**Duration:** 8 hours  
**Goal:** Full encryption/decryption working with Seal

### Morning Session (4 hours): Seal Setup

**Hour 1: Research Seal SDK**

```bash
# Check Seal documentation
# https://seal-docs.wal.app/

# Install Seal SDK (hypothetical - adjust based on actual SDK)
npm install @walrus/seal-sdk

# OR if not available, implement basic encryption wrapper
npm install tweetnacl tweetnacl-util
```

**Hour 2-3: Implement Encryption Layer**

`src/lib/seal/encryption.ts`:

```typescript
import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64, decodeBase64, encodeUTF8 } from 'tweetnacl-util';

// Simplified encryption using NaCl for MVP
// In production, replace with actual Seal SDK

export interface EncryptionKey {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export function generateEncryptionKey(): EncryptionKey {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
  };
}

export function encrypt(data: string, publicKey: Uint8Array, secretKey: Uint8Array): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = decodeUTF8(data);
  const encrypted = nacl.box(messageUint8, nonce, publicKey, secretKey);

  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);

  return encodeBase64(fullMessage);
}

export function decrypt(encryptedData: string, publicKey: Uint8Array, secretKey: Uint8Array): string {
  const messageWithNonce = decodeBase64(encryptedData);
  const nonce = messageWithNonce.slice(0, nacl.box.nonceLength);
  const message = messageWithNonce.slice(nacl.box.nonceLength);

  const decrypted = nacl.box.open(message, nonce, publicKey, secretKey);

  if (!decrypted) {
    throw new Error('Decryption failed');
  }

  return encodeUTF8(decrypted);
}

// Store encryption keys in localStorage (for MVP)
// In production, derive from Sui wallet signature
const STORAGE_KEY = 'suipass_encryption_key';

export function getOrCreateEncryptionKey(): EncryptionKey {
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (stored) {
    const { publicKey, secretKey } = JSON.parse(stored);
    return {
      publicKey: new Uint8Array(publicKey),
      secretKey: new Uint8Array(secretKey),
    };
  }

  const newKey = generateEncryptionKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    publicKey: Array.from(newKey.publicKey),
    secretKey: Array.from(newKey.secretKey),
  }));

  return newKey;
}
```

**Hour 4: Integrate Encryption into Hooks**

Update `src/hooks/useVault.ts`:

```typescript
import { encrypt, decrypt, getOrCreateEncryptionKey } from '@/lib/seal/encryption';

export function useVaultData() {
  const { data: vault } = useVault();

  return useQuery({
    queryKey: ['vaultData', vault?.walrusBlobId],
    queryFn: async (): Promise<VaultData> => {
      if (!vault?.walrusBlobId) {
        return {
          version: 1,
          entries: [],
          metadata: { totalEntries: 0, lastBackup: Date.now() },
        };
      }

      // Download from Walrus
      const encryptedBlob = await downloadFromWalrus(vault.walrusBlobId);
      const encryptedString = new TextDecoder().decode(encryptedBlob);

      // Decrypt with encryption key
      const { publicKey, secretKey } = getOrCreateEncryptionKey();
      const decrypted = decrypt(encryptedString, publicKey, secretKey);

      return JSON.parse(decrypted);
    },
    enabled: !!vault,
  });
}

export function useCreateVault() {
  // ... existing code

  return useMutation({
    mutationFn: async () => {
      if (!account) throw new Error('No account connected');

      const initialData: VaultData = {
        version: 1,
        entries: [],
        metadata: { totalEntries: 0, lastBackup: Date.now() },
      };

      // Encrypt before uploading
      const json = JSON.stringify(initialData);
      const { publicKey, secretKey } = getOrCreateEncryptionKey();
      const encrypted = encrypt(json, publicKey, secretKey);
      const blob = new TextEncoder().encode(encrypted);
      
      const blobId = await uploadToWalrus(blob);

      // ... rest of code
    },
  });
}

export function useAddPassword() {
  // ... similar encryption logic in mutationFn
  
  return useMutation({
    mutationFn: async (entry) => {
      // ... existing logic

      // Encrypt updated data
      const json = JSON.stringify(updatedData);
      const { publicKey, secretKey } = getOrCreateEncryptionKey();
      const encrypted = encrypt(json, publicKey, secretKey);
      const blob = new TextEncoder().encode(encrypted);
      
      const newBlobId = await uploadToWalrus(blob);

      // ... rest of code
    },
  });
}
```

### Afternoon Session (4 hours): Password Management UI

**Hour 1-2: Add Password Modal**

`src/components/AddPasswordModal.tsx`:

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAddPassword } from '@/hooks/useVault';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPasswordModal({ open, onOpenChange }: Props) {
  const [site, setSite] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');

  const addPassword = useAddPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addPassword.mutateAsync({
        site,
        url: url || `https://${site}`,
        username,
        password,
        notes,
        tags: [],
      });

      // Reset form
      setSite('');
      setUrl('');
      setUsername('');
      setPassword('');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add password:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Password</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="site">Site Name *</Label>
            <Input
              id="site"
              placeholder="facebook.com"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="url">URL (optional)</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://facebook.com/login"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="hung@gmail.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Personal account"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addPassword.isPending}>
              {addPassword.isPending ? 'Saving...' : 'Save Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Hour 3-4: Password List & Cards**

`src/components/PasswordEntry.tsx`:

```typescript
import { useState } from 'react';
import { Copy, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { PasswordEntry as PasswordEntryType } from '@/types/vault';

interface Props {
  entry: PasswordEntryType;
}

export function PasswordEntry({ entry }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg">{entry.site}</h3>
            {entry.url && (
              <a href={entry.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-3">{entry.username}</p>

          <div className="flex items-center gap-2">
            <code className="text-sm bg-muted px-3 py-1 rounded">
              {showPassword ? entry.password : '••••••••'}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>

          {entry.notes && (
            <p className="text-sm text-muted-foreground mt-3">{entry.notes}</p>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleCopy(entry.password)}
        >
          <Copy className="w-4 h-4" />
          {copied && <span className="ml-2 text-xs">Copied!</span>}
        </Button>
      </div>
    </Card>
  );
}
```

Update `src/components/Dashboard.tsx`:

```typescript
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordEntry } from './PasswordEntry';
import { AddPasswordModal } from './AddPasswordModal';

export function Dashboard() {
  const [showAddModal, setShowAddModal] = useState(false);
  // ... existing code

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Passwords</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Password
        </Button>
      </div>

      <div className="space-y-4">
        {vaultData?.entries.map((entry) => (
          <PasswordEntry key={entry.id} entry={entry} />
        ))}
      </div>

      <AddPasswordModal open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  );
}
```

**✅ Day 3 Checklist:**
- [x] Encryption layer implemented
- [x] All vault operations encrypted
- [x] Add password modal complete
- [x] Password list with show/hide
- [x] Copy to clipboard working

**Test Full Flow:**

```bash
npm run dev
# 1. Create vault → Check encrypted blob on Walrus
# 2. Add password → Verify encryption
# 3. View password → Verify decryption
# 4. Copy password → Test clipboard
```

**Commit:**

```bash
git add .
git commit -m "feat: Day 3 - Seal encryption + password UI"
```

---

## Day 4: zkLogin + UI Polish

**Duration:** 8 hours  
**Goal:** Google OAuth login + polished professional UI

### Morning Session (4 hours): zkLogin Integration

[Continue with zkLogin setup, afternoon UI polish...]

**✅ Day 4 Checklist:**
- [x] zkLogin configured
- [x] Google OAuth working
- [x] UI fully polished
- [x] Animations added
- [x] Mobile responsive

---

## Day 5: Extension + Mobile

**Duration:** 6 hours  
**Goal:** Browser extension + mobile-optimized web

[Extension setup and mobile responsive design...]

**✅ Day 5 Checklist:**
- [x] Extension manifest created
- [x] Popup UI working
- [x] Context menu implemented
- [x] Mobile responsive complete

---

## Day 6: Demo & Submission

**Duration:** 4 hours  
**Goal:** Record demo, polish docs, submit

[Final polish, demo recording, submission preparation...]

**✅ Day 6 Checklist:**
- [x] Demo video recorded
- [x] Presentation slides ready
- [x] README polished
- [x] Code deployed
- [x] Submission complete

---

## Emergency Fallback Plan

If running behind schedule:

**Priority 1 (Must Have):**
- Smart contract deployed
- Web app: add/view passwords
- Encryption working

**Priority 2 (Should Have):**
- zkLogin
- Polish UI

**Priority 3 (Nice to Have):**
- Extension
- Mobile responsive

**Cut if Needed:**
- Extension
- Advanced features
- Animations

---

**This plan ensures you have a working MVP by Day 4, with Days 5-6 for polish and extensions.**
