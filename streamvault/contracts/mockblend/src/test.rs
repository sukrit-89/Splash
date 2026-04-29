#![cfg(test)]

use super::*;
use soroban_sdk::{contract, contractimpl, contracttype, testutils::Address as _, Address, Env};

#[contracttype]
#[derive(Clone)]
enum TokenKey {
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
        let from_balance = Self::balance(env.clone(), from.clone());
        let to_balance = Self::balance(env.clone(), to.clone());
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

#[test]
fn test_deposit_and_redeem() {
    let env = Env::default();
    env.mock_all_auths();

    let vault = Address::generate(&env);
    let token_id = env.register(MockToken, ());
    let pool_id = env.register(MockBlendPool, ());
    let token = MockTokenClient::new(&env, &token_id);
    let pool = MockBlendPoolClient::new(&env, &pool_id);

    token.mint(&pool_id, &1_000);

    assert_eq!(pool.deposit(&vault, &token_id, &600), 600);
    assert_eq!(pool.position(&vault, &token_id), 600);

    assert_eq!(pool.redeem(&vault, &token_id, &250), 250);
    assert_eq!(pool.position(&vault, &token_id), 350);
    assert_eq!(token.balance(&vault), 250);
}
