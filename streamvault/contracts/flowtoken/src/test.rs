#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_metadata_and_mint_burn() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let contract_id = env.register(FlowToken, ());
    let client = FlowTokenClient::new(&env, &contract_id);

    client.initialize(&admin);
    assert_eq!(client.name(), String::from_str(&env, "splash"));
    assert_eq!(client.symbol(), symbol_short!("FLOW"));
    assert_eq!(client.decimals(), 7);

    client.mint(&recipient, &1_000);
    assert_eq!(client.balance(&recipient), 1_000);
    assert_eq!(client.total_supply(), 1_000);

    client.burn(&recipient, &400);
    assert_eq!(client.balance(&recipient), 600);
    assert_eq!(client.total_supply(), 600);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let buyer = Address::generate(&env);
    let contract_id = env.register(FlowToken, ());
    let client = FlowTokenClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.mint(&recipient, &1_000);
    client.transfer(&recipient, &buyer, &250);

    assert_eq!(client.balance(&recipient), 750);
    assert_eq!(client.balance(&buyer), 250);
}
