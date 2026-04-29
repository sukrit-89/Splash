#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, panic_with_error, Address,
    Env,
};

#[contract]
pub struct MockBlendPool;

#[contractclient(name = "TokenClient")]
pub trait TokenContract {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Position(Address, Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    InsufficientPosition = 2,
    Overflow = 3,
}

const BUMP_THRESHOLD: u32 = 30 * 17280;
const BUMP_AMOUNT: u32 = 30 * 17280;

fn read_position(env: &Env, vault: Address, token: Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Position(vault, token))
        .unwrap_or(0)
}

fn write_position(env: &Env, vault: Address, token: Address, amount: i128) {
    let key = DataKey::Position(vault, token);
    env.storage().persistent().set(&key, &amount);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

#[contractimpl]
impl MockBlendPool {
    pub fn deposit(env: Env, vault: Address, token: Address, amount: i128) -> i128 {
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let current = read_position(&env, vault.clone(), token.clone());
        let next = current
            .checked_add(amount)
            .unwrap_or_else(|| panic_with_error!(&env, Error::Overflow));
        write_position(&env, vault, token, next);
        amount
    }

    pub fn redeem(env: Env, vault: Address, token: Address, btoken_amount: i128) -> i128 {
        if btoken_amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let current = read_position(&env, vault.clone(), token.clone());
        if current < btoken_amount {
            panic_with_error!(&env, Error::InsufficientPosition);
        }
        write_position(
            &env,
            vault.clone(),
            token.clone(),
            current - btoken_amount,
        );
        TokenClient::new(&env, &token).transfer(
            &env.current_contract_address(),
            &vault,
            &btoken_amount,
        );
        btoken_amount
    }

    pub fn position(env: Env, vault: Address, token: Address) -> i128 {
        read_position(&env, vault, token)
    }
}

mod test;
