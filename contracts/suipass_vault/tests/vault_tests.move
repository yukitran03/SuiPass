// vault_tests.move file

#[test_only]
module suipass::vault_tests;

use sui::test_scenario;
use suipass::vault::{Self, Vault};

#[test]
/// Test vault creation
fun test_create_vault() {
    let user = @0xA;
    let mut scenario = test_scenario::begin(user);

    // Create vault
    {
        let ctx = scenario.ctx();
        let vault = vault::create_vault(
            b"blob123",
            b"policy456",
            ctx
        );

        assert!(vault.owner() == user);
        assert!(vault.entry_count() == 0);
        assert!(vault.version() == 1);
        assert!(vault.walrus_blob_id() == b"blob123");

        transfer::public_transfer(vault, user);
    };

    scenario.end();
}

#[test]
/// Test vault update
fun test_update_vault() {
    let user = @0xA;
    let mut scenario = test_scenario::begin(user);

    // Create vault
    {
        let ctx = scenario.ctx();
        vault::create_and_keep_vault(
            b"blob123",
            b"policy456",
            ctx
        );
    };

    scenario.next_tx(user);

    // Update vault
    {
        let mut vault = scenario.take_from_sender<Vault>();
        let ctx = scenario.ctx();

        vault::update_vault(
            &mut vault,
            b"new_blob789",
            5,
            ctx
        );

        assert!(vault.entry_count() == 5);
        assert!(vault.version() == 2);
        assert!(vault.walrus_blob_id() == b"new_blob789");

        scenario.return_to_sender(vault);
    };

    scenario.end();
}

#[test, expected_failure(abort_code = vault::ENotOwner)]
/// Test that only owner can update vault
fun test_update_vault_not_owner() {
    let owner = @0xA;
    let attacker = @0xB;
    let mut scenario = test_scenario::begin(owner);

    // Owner creates vault
    {
        let ctx = scenario.ctx();
        vault::create_and_keep_vault(
            b"blob123",
            b"policy456",
            ctx
        );
    };

    // Attacker tries to update
    scenario.next_tx(attacker);
    {
        let mut vault = scenario.take_from_address<Vault>(owner);
        let ctx = scenario.ctx();

        // This should fail with ENotOwner
        vault::update_vault(
            &mut vault,
            b"hacked",
            999,
            ctx
        );

        test_scenario::return_to_address(owner, vault);
    };

    scenario.end();
}

#[test]
/// Test vault deletion
fun test_destroy_vault() {
    let user = @0xA;
    let mut scenario = test_scenario::begin(user);

    // Create vault
    {
        let ctx = scenario.ctx();
        vault::create_and_keep_vault(
            b"blob123",
            b"policy456",
            ctx
        );
    };

    scenario.next_tx(user);

    // Delete vault
    {
        let vault = scenario.take_from_sender<Vault>();
        vault::destroy_vault(vault);
        // Vault is now deleted
    };

    scenario.end();
}

#[test]
/// Test multiple vaults for same user
fun test_multiple_vaults() {
    let user = @0xA;
    let mut scenario = test_scenario::begin(user);

    // Create first vault
    {
        let ctx = scenario.ctx();
        vault::create_and_keep_vault(
            b"vault1_blob",
            b"policy1",
            ctx
        );
    };

    scenario.next_tx(user);

    // Create second vault
    {
        let ctx = scenario.ctx();
        vault::create_and_keep_vault(
            b"vault2_blob",
            b"policy2",
            ctx
        );
    };

    scenario.next_tx(user);

    // User should have 2 vaults
    {
        let vault1 = scenario.take_from_sender<Vault>();
        let vault2 = scenario.take_from_sender<Vault>();

        // Both should belong to user
        assert!(vault1.owner() == user);
        assert!(vault2.owner() == user);

        // Different blob IDs
        assert!(vault1.walrus_blob_id() != vault2.walrus_blob_id());

        scenario.return_to_sender(vault1);
        scenario.return_to_sender(vault2);
    };

    scenario.end();
}

#[test]
/// Test version increments on update
fun test_version_increments() {
    let user = @0xA;
    let mut scenario = test_scenario::begin(user);

    // Create vault
    {
        let ctx = scenario.ctx();
        vault::create_and_keep_vault(
            b"initial_blob",
            b"policy",
            ctx
        );
    };

    scenario.next_tx(user);

    // Update multiple times
    {
        let mut vault = scenario.take_from_sender<Vault>();
        let ctx = scenario.ctx();

        assert!(vault.version() == 1);

        // First update
        vault::update_vault(&mut vault, b"blob_v2", 1, ctx);
        assert!(vault.version() == 2);

        // Second update
        vault::update_vault(&mut vault, b"blob_v3", 2, ctx);
        assert!(vault.version() == 3);

        // Third update
        vault::update_vault(&mut vault, b"blob_v4", 3, ctx);
        assert!(vault.version() == 4);

        scenario.return_to_sender(vault);
    };

    scenario.end();
}

#[test, expected_failure(abort_code = vault::EInvalidBlobId)]
/// Test that empty blob ID fails
fun test_empty_blob_id_fails() {
    let user = @0xA;
    let mut scenario = test_scenario::begin(user);

    {
        let ctx = scenario.ctx();
        // This should fail with EInvalidBlobId
        vault::create_and_keep_vault(
            b"", // Empty blob ID
            b"policy",
            ctx
        );
    };

    scenario.end();
}
