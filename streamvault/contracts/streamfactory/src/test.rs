#![cfg(test)]

use super::*;
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env};

#[contract]
struct MockVault;

#[contractimpl]
impl MockVault {
    pub fn create_stream(
        env: Env,
        _sender: Address,
        _recipient: Address,
        _token: Address,
        _rate_per_second: i128,
        _duration_seconds: u64,
    ) -> u64 {
        let key = 1u32;
        let id = env.storage().persistent().get(&key).unwrap_or(0u64);
        env.storage().persistent().set(&key, &(id + 1));
        id
    }
}

#[test]
fn test_factory_registry_correct() {
    let env = Env::default();
    env.mock_all_auths();

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let other_recipient = Address::generate(&env);
    let token = Address::generate(&env);

    let vault_id = env.register(MockVault, ());
    let factory_id = env.register(StreamFactory, ());
    let factory = StreamFactoryClient::new(&env, &factory_id);

    let first = factory.create_stream(&sender, &vault_id, &recipient, &token, &1, &100);
    let second = factory.create_stream(&sender, &vault_id, &recipient, &token, &2, &100);
    let third = factory.create_stream(&sender, &vault_id, &other_recipient, &token, &3, &100);

    let sender_streams = factory.get_streams_by_sender(&sender);
    assert_eq!(sender_streams.len(), 3);
    assert_eq!(sender_streams.get(0).unwrap(), first);
    assert_eq!(sender_streams.get(1).unwrap(), second);
    assert_eq!(sender_streams.get(2).unwrap(), third);

    let recipient_streams = factory.get_streams_by_recipient(&recipient);
    assert_eq!(recipient_streams.len(), 2);
    assert_eq!(recipient_streams.get(0).unwrap(), first);
    assert_eq!(recipient_streams.get(1).unwrap(), second);
}
