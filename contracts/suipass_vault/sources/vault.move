/// SuiPass Vault Module
/// Manages user password vaults with encrypted data stored on Walrus
module suipass::vault;

use sui::object::{Self, UID, ID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::event;

// === Error Codes ===

/// Error: Caller is not the vault owner
const ENotOwner: u64 = 0;
/// Error: Blob ID is empty or invalid
const EInvalidBlobId: u64 = 1;

// === Structs ===

/// User's password vault metadata stored on-chain
/// The actual encrypted passwords are stored on Walrus (off-chain)
public struct Vault has key, store {
    id: UID,
    /// Address of the vault owner
    owner: address,
    /// Walrus blob ID where encrypted password data is stored
    walrus_blob_id: vector<u8>,
    /// Seal policy ID for encryption/decryption
    seal_policy_id: vector<u8>,
    /// Number of password entries in the vault
    entry_count: u64,
    /// Epoch when vault was created
    created_at: u64,
    /// Epoch when vault was last updated
    updated_at: u64,
    /// Version number for conflict resolution
    version: u64,
}

// === Events ===

/// Event emitted when a new vault is created
public struct VaultCreated has copy, drop {
    vault_id: ID,
    owner: address,
    created_at: u64,
}

/// Event emitted when vault is updated with new data
public struct VaultUpdated has copy, drop {
    vault_id: ID,
    new_blob_id: vector<u8>,
    entry_count: u64,
    version: u64,
    updated_at: u64,
}

/// Event emitted when vault is deleted
public struct VaultDeleted has copy, drop {
    vault_id: ID,
    owner: address,
}

// === Public Functions ===

/// Create a new vault for the user
/// Returns the vault object for composability
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

/// Create vault and transfer to sender (convenience function)
entry fun create_and_keep_vault(
    walrus_blob_id: vector<u8>,
    seal_policy_id: vector<u8>,
    ctx: &mut TxContext
) {
    let vault = create_vault(walrus_blob_id, seal_policy_id, ctx);
    transfer::transfer(vault, ctx.sender());
}

/// Update vault with new encrypted blob from Walrus
/// Only vault owner can update
public fun update_vault(
    vault: &mut Vault,
    new_blob_id: vector<u8>,
    new_entry_count: u64,
    ctx: &mut TxContext
) {
    // Verify ownership
    assert!(vault.owner == ctx.sender(), ENotOwner);
    assert!(new_blob_id.length() > 0, EInvalidBlobId);
    
    // Update vault data
    vault.walrus_blob_id = new_blob_id;
    vault.entry_count = new_entry_count;
    vault.updated_at = ctx.epoch();
    vault.version = vault.version + 1;

    event::emit(VaultUpdated {
        vault_id: object::id(vault),
        new_blob_id,
        entry_count: new_entry_count,
        version: vault.version,
        updated_at: vault.updated_at,
    });
}

/// Delete vault permanently
/// Only vault owner can delete (ownership is enforced by taking vault by value)
entry fun destroy_vault(vault: Vault) {
    let Vault { 
        id, 
        owner,
        walrus_blob_id: _,
        seal_policy_id: _,
        entry_count: _,
        created_at: _,
        updated_at: _,
        version: _,
    } = vault;

    event::emit(VaultDeleted {
        vault_id: object::uid_to_inner(&id),
        owner,
    });

    object::delete(id);
}

// === Getter Functions ===

/// Get vault owner address
public fun owner(vault: &Vault): address { 
    vault.owner 
}

/// Get Walrus blob ID
public fun walrus_blob_id(vault: &Vault): vector<u8> { 
    vault.walrus_blob_id 
}

/// Get Seal policy ID
public fun seal_policy_id(vault: &Vault): vector<u8> { 
    vault.seal_policy_id 
}

/// Get entry count
public fun entry_count(vault: &Vault): u64 { 
    vault.entry_count 
}

/// Get vault version
public fun version(vault: &Vault): u64 { 
    vault.version 
}

/// Get creation epoch
public fun created_at(vault: &Vault): u64 { 
    vault.created_at 
}

/// Get last update epoch
public fun updated_at(vault: &Vault): u64 { 
    vault.updated_at 
}
