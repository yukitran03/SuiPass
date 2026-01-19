# SuiPass - Technical Design Document

---

## Executive Summary

SuiPass is a decentralized password manager leveraging Sui's newest primitives (Seal encryption + Walrus storage + zkLogin authentication) to provide users with Web2-quality UX while maintaining true data ownership and privacy. Unlike centralized competitors (1Password, Bitwarden), SuiPass ensures users own their encrypted data, cannot be vendor-locked, and achieve automatic cross-device sync without subscriptions.

**Key Differentiators:**
- 🔐 **Seal encryption** (released Jan 8, 2026) - bleeding edge technology
- 📦 **Walrus storage** - decentralized, cost-effective blob storage  
- 🎫 **zkLogin** - Google OAuth, no seed phrases
- 🌐 **Multi-platform** - Web app + Browser extension + Mobile responsive
- 💰 **Free** - Only pay Sui gas fees (~$0.01 per operation)

**Innovation Score:** 9/10 (Seal is brand new, first hackathon to use it)  
**Feasibility:** HIGH (solo developer, 6 days, proven tech stack)  
**CommandOSS Alignment:** PERFECT (cryptography + TypeScript + Sui primitives)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web App     │  │  Extension   │  │  Mobile Web  │      │
│  │  (React)     │  │  (Popup)     │  │  (Responsive)│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────┐
│         │      INTEGRATION LAYER (TypeScript SDK)            │
│         │                                                     │
│  ┌──────▼───────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Sui dApp Kit │  │  Seal SDK    │  │  Walrus SDK  │      │
│  │ (wallet +    │  │  (encrypt/   │  │  (blob       │      │
│  │  zkLogin)    │  │   decrypt)   │  │   storage)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────┐
│         │         BLOCKCHAIN LAYER                           │
│         │                                                     │
│  ┌──────▼───────────────────────────────────────┐           │
│  │          Sui Blockchain (Testnet)            │           │
│  │                                               │           │
│  │  ┌────────────────┐    ┌─────────────────┐  │           │
│  │  │ Vault Registry │    │ Access Control  │  │           │
│  │  │ (Move Smart    │    │ (Seal Policies) │  │           │
│  │  │  Contract)     │    │                 │  │           │
│  │  └────────────────┘    └─────────────────┘  │           │
│  └───────────────────────────────────────────────┘           │
│                                                               │
│  ┌───────────────────────────────────────────────┐           │
│  │        Walrus Decentralized Storage           │           │
│  │  (Encrypted Password Blobs + Metadata)        │           │
│  └───────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Breakdown

| Component | Technology | Purpose | Status |
|-----------|-----------|---------|--------|
| **Web Frontend** | React 18 + TypeScript + Vite | Main user interface | Day 1-4 |
| **Browser Extension** | Manifest V3 + React | Quick access popup | Day 5 |
| **Mobile Web** | Responsive CSS + Touch UI | Mobile-optimized view | Day 5 |
| **Smart Contract** | Sui Move 2024 | Vault registry on-chain | Day 1-2 |
| **Encryption Layer** | Seal SDK | Client-side encryption | Day 3 |
| **Storage Layer** | Walrus HTTP API | Decentralized blob storage | Day 2-3 |
| **Auth Layer** | zkLogin (Google OAuth) | Passwordless authentication | Day 4 |
| **UI Components** | shadcn/ui + Tailwind CSS | Polished component library | Day 1-6 |

---

## 2. Data Model & Storage Architecture

### 2.1 On-Chain Data (Sui Blockchain)

**Vault Object (Owned by User)**

```move
/// User's password vault metadata stored on-chain
public struct Vault has key, store {
    id: UID,
    owner: address,
    walrus_blob_id: vector<u8>,     // Reference to Walrus blob
    seal_policy_id: ID,              // Seal access control policy
    entry_count: u64,                // Number of password entries
    created_at: u64,                 // Epoch timestamp
    updated_at: u64,                 // Last modification timestamp
    version: u64,                    // Version for conflict resolution
}
```

**Key Design Decisions:**
- `Vault` is an owned object → user has full control, can delete/transfer
- Minimal on-chain storage → only metadata, actual passwords on Walrus
- `walrus_blob_id` is immutable once created → append-only pattern
- `seal_policy_id` links to Seal's decryption policy

### 2.2 Off-Chain Data (Walrus Storage)

**Encrypted Blob Structure (JSON, encrypted with Seal)**

```json
{
  "version": 1,
  "entries": [
    {
      "id": "uuid-v4-string",
      "site": "facebook.com",
      "url": "https://facebook.com/login",
      "username": "hung@gmail.com",
      "password": "encrypted_password_string",
      "notes": "Personal account",
      "created_at": 1705132800,
      "updated_at": 1705132800,
      "tags": ["social", "personal"]
    }
  ],
  "metadata": {
    "total_entries": 1,
    "last_backup": 1705132800
  }
}
```

**Encryption Flow:**
1. User adds password entry
2. Frontend constructs JSON blob
3. Seal encrypts entire blob with user's key
4. Upload encrypted blob to Walrus → get `blob_id`
5. Update Vault object on Sui with new `blob_id`


---

## 3. Security Architecture

### 3.1 Encryption Model (Seal)

**Seal Policy Overview:**
```
User's Sui Address → Seal Key Derivation → Encryption Key
                   ↓
            Access Policy (on-chain)
                   ↓
       Only user's address can decrypt
```

**Key Management:**
- User NEVER manages encryption keys directly
- Seal derives keys from Sui wallet signature
- zkLogin wallet = deterministic address from Google OAuth
- Lost Google account = lost vault (trade-off for UX)

**Seal Integration Points:**

```typescript
// Encrypt password blob
const encryptedBlob = await seal.encrypt({
  data: JSON.stringify(vaultData),
  policyId: user.sealPolicyId,
  recipientAddress: user.suiAddress
});

// Decrypt password blob
const decryptedData = await seal.decrypt({
  encryptedBlob: walrusBlob,
  policyId: user.sealPolicyId,
  signerAddress: user.suiAddress
});
```

### 3.2 Attack Vector Analysis

| Attack Vector | Mitigation | Severity |
|--------------|------------|----------|
| **Phishing user credentials** | zkLogin eliminates seed phrases | LOW |
| **Man-in-the-middle** | All data encrypted client-side | LOW |
| **Walrus node compromise** | Data encrypted, nodes can't read | LOW |
| **Smart contract exploit** | Minimal contract logic, no funds | MEDIUM |
| **Client-side malware** | Same risk as any password manager | HIGH |
| **Lost Google account** | No recovery (explicit trade-off) | CRITICAL |

**Recovery Strategy:**
- Export encrypted backup (download JSON)
- Store backup in safe location
- Import backup if needed to create new vault

### 3.3 Privacy Guarantees

**What's Public:**
- User's Sui address owns a Vault object
- Vault exists with X entries (count only)
- Blob ID reference (but blob is encrypted)

**What's Private:**
- All password data (sites, usernames, passwords)
- Number and names of sites
- All notes and metadata

---

## 4. User Experience Design

### 4.1 Core User Flows

**Flow 1: First-Time User Onboarding**

```
1. Visit app.suipass.xyz
   ↓
2. Click "Sign in with Google"
   ↓
3. Google OAuth (zkLogin) → Sui address derived
   ↓
4. "Create Your Vault" button
   ↓
5. Transaction: Create Vault object on Sui
   ↓
6. Welcome screen: "Your vault is ready!"
   ↓
7. Dashboard (empty state): "Add your first password"
```

**Flow 2: Adding a Password**

```
1. Click "+ Add Password" button
   ↓
2. Modal appears with form:
   - Site (required): "facebook.com"
   - Username (required): "hung@gmail.com"
   - Password (required): •••••••• [Show] [Generate]
   - Notes (optional): "Personal account"
   ↓
3. Click "Save"
   ↓
4. Frontend:
   - Construct JSON blob
   - Encrypt with Seal
   - Upload to Walrus
   ↓
5. Update Vault object on Sui
   ↓
6. Success toast: "Password saved!"
   ↓
7. Entry appears in list
```

**Flow 3: Retrieving a Password**

```
1. User sees list: "Facebook - hung@gmail.com"
   ↓
2. Click "View" button
   ↓
3. Modal: "Unlock vault" → Enter master password (optional extra layer)
   ↓
4. Backend:
   - Fetch Vault object from Sui
   - Download blob from Walrus
   - Decrypt with Seal
   ↓
5. Display password: •••••••• [Show] [Copy]
   ↓
6. Click "Copy" → Copied to clipboard
   ↓
7. Toast: "Password copied!"
```
---

## 5. Technical Implementation Details

### 5.1 Smart Contract Architecture (Move)

**Module Structure:**

```
suipass_contracts/
├── Move.toml
└── sources/
    ├── vault.move           # Main vault logic
    ├── events.move          # Event emissions
    └── tests/
        └── vault_tests.move
```

**Core Move Functions:**

```move
module suipass::vault;

use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::event;

/// User's password vault metadata
public struct Vault has key, store {
    id: UID,
    owner: address,
    walrus_blob_id: vector<u8>,
    seal_policy_id: ID,
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
    updated_at: u64,
}

/// Create a new vault for the user
public fun create_vault(
    walrus_blob_id: vector<u8>,
    seal_policy_id: ID,
    ctx: &mut TxContext
): Vault {
    let sender = ctx.sender();
    let vault = Vault {
        id: object::new(ctx),
        owner: sender,
        walrus_blob_id,
        seal_policy_id,
        entry_count: 0,
        created_at: ctx.epoch(),
        updated_at: ctx.epoch(),
        version: 1,
    };

    event::emit(VaultCreated {
        vault_id: object::id(&vault),
        owner: sender,
        created_at: ctx.epoch(),
    });

    vault
}

/// Update vault with new encrypted blob
public fun update_vault(
    vault: &mut Vault,
    new_blob_id: vector<u8>,
    new_entry_count: u64,
    ctx: &mut TxContext
) {
    assert!(vault.owner == ctx.sender(), ENotOwner);
    
    vault.walrus_blob_id = new_blob_id;
    vault.entry_count = new_entry_count;
    vault.updated_at = ctx.epoch();
    vault.version = vault.version + 1;

    event::emit(VaultUpdated {
        vault_id: object::id(vault),
        new_blob_id,
        entry_count: new_entry_count,
        updated_at: ctx.epoch(),
    });
}

/// Delete vault (user owns object, can destroy)
public fun destroy_vault(vault: Vault) {
    let Vault { id, .. } = vault;
    id.delete();
}

// Getter functions
public fun owner(vault: &Vault): address { vault.owner }
public fun walrus_blob_id(vault: &Vault): vector<u8> { vault.walrus_blob_id }
public fun entry_count(vault: &Vault): u64 { vault.entry_count }
public fun version(vault: &Vault): u64 { vault.version }
```

### 5.2 Frontend Architecture (React + TypeScript)

**Project Structure:**

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── Auth/
│   │   │   ├── LoginButton.tsx
│   │   │   └── UserProfile.tsx
│   │   ├── Vault/
│   │   │   ├── VaultList.tsx
│   │   │   ├── VaultCard.tsx
│   │   │   └── AddPasswordModal.tsx
│   │   ├── Password/
│   │   │   ├── PasswordEntry.tsx
│   │   │   ├── PasswordGenerator.tsx
│   │   │   └── PasswordStrength.tsx
│   │   └── Layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Dashboard.tsx
│   ├── lib/
│   │   ├── sui/
│   │   │   ├── client.ts       # Sui client setup
│   │   │   ├── transactions.ts # PTB builders
│   │   │   └── queries.ts      # React Query hooks
│   │   ├── seal/
│   │   │   ├── encrypt.ts
│   │   │   └── decrypt.ts
│   │   ├── walrus/
│   │   │   ├── upload.ts
│   │   │   └── download.ts
│   │   └── utils/
│   │       ├── password-gen.ts
│   │       └── crypto.ts
│   ├── hooks/
│   │   ├── useSuiAuth.ts
│   │   ├── useVault.ts
│   │   └── usePasswords.ts
│   ├── types/
│   │   ├── vault.ts
│   │   └── password.ts
│   └── App.tsx
├── package.json
├── vite.config.ts
└── tsconfig.json
```

**Key Integration Code:**

```typescript
// lib/sui/client.ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { createNetworkConfig } from '@mysten/dapp-kit';

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    testnet: {
      url: getFullnodeUrl('testnet'),
      variables: {
        packageId: '0xYOUR_PACKAGE_ID',
      },
    },
  });

export const suiClient = new SuiClient({ url: networkConfig.testnet.url });
export { networkConfig, useNetworkVariable };

// lib/seal/encrypt.ts
import { Seal } from '@seal/sdk'; // Hypothetical, actual SDK may differ

export async function encryptVaultData(
  data: VaultData,
  policyId: string,
  userAddress: string
): Promise<Uint8Array> {
  const seal = new Seal();
  const encrypted = await seal.encrypt({
    data: JSON.stringify(data),
    policyId,
    recipient: userAddress,
  });
  return encrypted;
}

// lib/walrus/upload.ts
export async function uploadToWalrus(
  encryptedBlob: Uint8Array
): Promise<string> {
  const response = await fetch('https://walrus.xyz/v1/store', {
    method: 'POST',
    body: encryptedBlob,
  });
  const { blobId } = await response.json();
  return blobId;
}

// hooks/useVault.ts
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export function useCreateVault() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  return async (blobId: string, sealPolicyId: string) => {
    if (!account) throw new Error('No account connected');

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::vault::create_vault`,
      arguments: [
        tx.pure.vector('u8', Array.from(Buffer.from(blobId))),
        tx.pure.id(sealPolicyId),
      ],
    });

    return new Promise((resolve, reject) => {
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        }
      );
    });
  };
}
```

### 5.3 Extension Architecture

**Manifest V3 Structure:**

```json
{
  "manifest_version": 3,
  "name": "SuiPass - Password Manager",
  "version": "1.0.0",
  "description": "Decentralized password manager powered by Sui + Seal",
  "permissions": ["contextMenus", "clipboardWrite", "storage"],
  "host_permissions": [
    "https://walrus.xyz/*",
    "https://fullnode.testnet.sui.io/*"
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```



## 8. Success Metrics

**For Hackathon Win:**
- ✅ Live demo works flawlessly (backup video ready)
- ✅ Demonstrates all Sui primitives (Seal, Walrus, zkLogin, PTBs)
- ✅ UI is polished and professional
- ✅ Code is clean and well-documented
- ✅ Innovation score: Seal usage (brand new)

**For CommandOSS Hiring:**
- ✅ Demonstrates TypeScript/React expertise
- ✅ Shows understanding of cryptography (Seal)
- ✅ Clean smart contract code (Move best practices)
- ✅ Fast MVP execution (6 days)
- ✅ Product thinking (UX-first approach)

---

---

## 10. References & Resources

**Sui Documentation:**
- Sui Docs: https://docs.sui.io
- Move Book: https://move-book.com
- Sui SDK: https://sdk.mystenlabs.com
- zkLogin Guide: https://docs.sui.io/concepts/cryptography/zklogin

**Seal & Walrus:**
- Seal Docs: https://seal-docs.wal.app
- Walrus Docs: https://docs.wal.app
- Walrus Sites: https://docs.wal.app/docs/walrus-sites/intro

**Design Resources:**
- Sui Brand Guidelines: https://sui.io/brand
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com

**Reference Projects:**
- Passman (reference only): https://trypassman.xyz
- Sui Examples: https://github.com/MystenLabs/sui/tree/main/examples

