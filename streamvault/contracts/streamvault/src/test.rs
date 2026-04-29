#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl, contracttype,
    testutils::{Address as _, Ledger},
    Address, Env,
};

#[contracttype]
#[derive(Clone)]
enum TokenKey {
    Balance(Address),
}

#[contracttype]
#[derive(Clone)]
enum BlendKey {
    Position(Address),
}

#[contracttype]
#[derive(Clone)]
enum FlowKey {
    Balance(Address),
}

#[contract]
struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn mint(env: Env, to: Address, amount: i128) {
        let current = Self::balance(env.clone(), to.clone());
        env.storage()
            .persistent()
            .set(&TokenKey::Balance(to), &(current + amount));
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if from == to {
            return;
        }
        let from_balance = Self::balance(env.clone(), from.clone());
        let to_balance = Self::balance(env.clone(), to.clone());
        assert!(amount > 0, "amount must be positive");
        assert!(from_balance >= amount, "insufficient balance");

        env.storage()
            .persistent()
            .set(&TokenKey::Balance(from), &(from_balance - amount));
        env.storage()
            .persistent()
            .set(&TokenKey::Balance(to), &(to_balance + amount));
    }

    pub fn balance(env: Env, owner: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&TokenKey::Balance(owner))
            .unwrap_or(0)
    }
}

#[contract]
struct MockBlend;

#[contractimpl]
impl MockBlend {
    pub fn deposit(env: Env, vault: Address, _token: Address, amount: i128) -> i128 {
        let current = env
            .storage()
            .persistent()
            .get(&BlendKey::Position(vault.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&BlendKey::Position(vault), &(current + amount));
        amount
    }

    pub fn redeem(env: Env, vault: Address, token: Address, btoken_amount: i128) -> i128 {
        let current = env
            .storage()
            .persistent()
            .get(&BlendKey::Position(vault.clone()))
            .unwrap_or(0);
        assert!(current >= btoken_amount, "insufficient blend position");
        env.storage()
            .persistent()
            .set(&BlendKey::Position(vault.clone()), &(current - btoken_amount));

        let yield_amount = btoken_amount / 10;
        let redeemed = btoken_amount + yield_amount;
        MockTokenClient::new(&env, &token).mint(&vault, &redeemed);
        redeemed
    }
}

#[contract]
struct MockFlowToken;

#[contractimpl]
impl MockFlowToken {
    pub fn mint(env: Env, to: Address, amount: i128) {
        let current = Self::balance(env.clone(), to.clone());
        env.storage()
            .persistent()
            .set(&FlowKey::Balance(to), &(current + amount));
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        let current = Self::balance(env.clone(), from.clone());
        assert!(current >= amount, "insufficient flow balance");
        env.storage()
            .persistent()
            .set(&FlowKey::Balance(from), &(current - amount));
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&FlowKey::Balance(id))
            .unwrap_or(0)
    }
}

#[test]
fn test_create_stream_stores_correctly() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_id = env.register(MockToken, ());
    let token_client = MockTokenClient::new(&env, &token_id);
    token_client.mint(&sender, &1_000_000);

    let contract_id = env.register(StreamVault, ());
    let client = StreamVaultClient::new(&env, &contract_id);

    // Note: The final argument is duration_seconds (100).
    // The transferred total_deposit (1000) is computed as rate_per_second (10) * duration_seconds (100).
    let stream_id = client.create_stream(&sender, &recipient, &token_id, &10, &100);
    assert_eq!(stream_id, 0);
    assert_eq!(client.get_stream_count(), 1);

    let stream = client.get_stream(&stream_id);
    assert_eq!(stream.sender, sender);
    assert_eq!(stream.recipient, recipient);
    assert_eq!(stream.token, token_id);
    assert_eq!(stream.rate_per_second, 10);
    assert_eq!(stream.total_deposit, 1_000);
    assert_eq!(stream.already_withdrawn, 0);
    assert_eq!(stream.start_timestamp, 1_000);
    assert_eq!(stream.end_timestamp, 1_100);
    assert_eq!(stream.status, StreamStatus::Active);
}

#[test]
fn test_withdraw_calculates_correctly() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(2_000);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_id = env.register(MockToken, ());
    let token_client = MockTokenClient::new(&env, &token_id);
    token_client.mint(&sender, &1_000_000);

    let contract_id = env.register(StreamVault, ());
    let client = StreamVaultClient::new(&env, &contract_id);

    let stream_id = client.create_stream(&sender, &recipient, &token_id, &5, &200);

    env.ledger().set_timestamp(2_050);
    let withdrawn = client.withdraw(&stream_id);
    assert_eq!(withdrawn, 250);

    let recipient_balance = token_client.balance(&recipient);
    assert_eq!(recipient_balance, 250);

    let stream = client.get_stream(&stream_id);
    assert_eq!(stream.already_withdrawn, 250);
    assert_eq!(stream.status, StreamStatus::Active);
}

#[test]
fn test_cancel_returns_correct_split() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(3_000);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_id = env.register(MockToken, ());
    let token_client = MockTokenClient::new(&env, &token_id);
    token_client.mint(&sender, &1_000_000);

    let contract_id = env.register(StreamVault, ());
    let client = StreamVaultClient::new(&env, &contract_id);

    let stream_id = client.create_stream(&sender, &recipient, &token_id, &10, &100);
    env.ledger().set_timestamp(3_050);

    let (recipient_owed, sender_refund) = client.cancel(&stream_id);
    assert_eq!(recipient_owed, 500);
    assert_eq!(sender_refund, 500);

    assert_eq!(token_client.balance(&recipient), 500);
    // Sender started with 1_000_000, deposited 1_000, refunded 500.
    assert_eq!(token_client.balance(&sender), 999_500);

    let stream = client.get_stream(&stream_id);
    assert_eq!(stream.status, StreamStatus::Cancelled);
    assert_eq!(stream.already_withdrawn, 500);
}

#[test]
fn test_multiple_withdrawals_reach_completion() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(4_000);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_id = env.register(MockToken, ());
    let token_client = MockTokenClient::new(&env, &token_id);
    token_client.mint(&sender, &1_000_000);

    let contract_id = env.register(StreamVault, ());
    let client = StreamVaultClient::new(&env, &contract_id);

    let stream_id = client.create_stream(&sender, &recipient, &token_id, &2, &100);

    env.ledger().set_timestamp(4_040);
    assert_eq!(client.withdraw(&stream_id), 80);

    env.ledger().set_timestamp(4_120);
    assert_eq!(client.withdraw(&stream_id), 120);

    let stream = client.get_stream(&stream_id);
    assert_eq!(stream.total_deposit, 200);
    assert_eq!(stream.already_withdrawn, 200);
    assert_eq!(stream.status, StreamStatus::Completed);
    assert_eq!(token_client.balance(&recipient), 200);
}

#[test]
#[should_panic]
fn test_cancel_after_end_rejects_completed_stream() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(5_000);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_id = env.register(MockToken, ());
    let token_client = MockTokenClient::new(&env, &token_id);
    token_client.mint(&sender, &1_000_000);

    let contract_id = env.register(StreamVault, ());
    let client = StreamVaultClient::new(&env, &contract_id);

    let stream_id = client.create_stream(&sender, &recipient, &token_id, &2, &100);

    env.ledger().set_timestamp(5_100);
    client.cancel(&stream_id);
}

#[test]
fn test_flow_token_minted_on_create() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(6_000);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_id = env.register(MockToken, ());
    let token_client = MockTokenClient::new(&env, &token_id);
    token_client.mint(&sender, &1_000_000);

    let blend_id = env.register(MockBlend, ());
    let flow_id = env.register(MockFlowToken, ());
    let contract_id = env.register(StreamVault, ());
    let client = StreamVaultClient::new(&env, &contract_id);
    let flow_client = MockFlowTokenClient::new(&env, &flow_id);

    client.initialize(&sender, &blend_id, &flow_id, &1_000);

    let stream_id = client.create_stream(&sender, &recipient, &token_id, &10, &100);
    let stream = client.get_stream(&stream_id);

    assert_eq!(flow_client.balance(&recipient), 1_000);
    assert_eq!(stream.blend_position, 1_000);
    assert_eq!(stream.flow_burned, 0);
}

#[test]
fn test_flow_token_burned_on_withdraw_with_yield() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(7_000);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_id = env.register(MockToken, ());
    let token_client = MockTokenClient::new(&env, &token_id);
    token_client.mint(&sender, &1_000_000);

    let blend_id = env.register(MockBlend, ());
    let flow_id = env.register(MockFlowToken, ());
    let contract_id = env.register(StreamVault, ());
    let client = StreamVaultClient::new(&env, &contract_id);
    let flow_client = MockFlowTokenClient::new(&env, &flow_id);

    client.initialize(&sender, &blend_id, &flow_id, &1_000);

    let stream_id = client.create_stream(&sender, &recipient, &token_id, &10, &100);
    env.ledger().set_timestamp(7_050);

    let withdrawn = client.withdraw(&stream_id);
    assert_eq!(withdrawn, 545);
    assert_eq!(flow_client.balance(&recipient), 500);
    assert_eq!(token_client.balance(&recipient), 545);

    let stream = client.get_stream(&stream_id);
    assert_eq!(stream.already_withdrawn, 500);
    assert_eq!(stream.flow_burned, 500);
    assert_eq!(stream.yield_earned, 45);
}
