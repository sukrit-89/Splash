#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Env, String, Symbol,
};

#[contract]
pub struct FlowToken;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Balance(Address),
    TotalSupply,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InsufficientBalance = 4,
}

const BUMP_THRESHOLD: u32 = 30 * 17280;
const BUMP_AMOUNT: u32 = 30 * 17280;

fn checked_add(env: &Env, a: i128, b: i128) -> i128 {
    a.checked_add(b)
        .unwrap_or_else(|| panic_with_error!(env, Error::InvalidAmount))
}

fn checked_sub(env: &Env, a: i128, b: i128) -> i128 {
    a.checked_sub(b)
        .unwrap_or_else(|| panic_with_error!(env, Error::InsufficientBalance))
}

fn balance(env: &Env, id: Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Balance(id))
        .unwrap_or(0)
}

fn set_balance(env: &Env, id: Address, amount: i128) {
    let key = DataKey::Balance(id);
    env.storage().persistent().set(&key, &amount);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn admin(env: &Env) -> Address {
    env.storage()
        .persistent()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

#[contractimpl]
impl FlowToken {
    pub fn initialize(env: Env, admin: Address) {
        let key = DataKey::Admin;
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&key, &admin);
    }

    pub fn name(env: Env) -> String {
        String::from_str(&env, "splash")
    }

    pub fn symbol(_env: Env) -> Symbol {
        symbol_short!("FLOW")
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        balance(&env, id)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let from_balance = balance(&env, from.clone());
        if from_balance < amount {
            panic_with_error!(&env, Error::InsufficientBalance);
        }
        let to_balance = balance(&env, to.clone());
        set_balance(&env, from, checked_sub(&env, from_balance, amount));
        set_balance(&env, to, checked_add(&env, to_balance, amount));
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        admin(&env).require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let supply = Self::total_supply(env.clone());
        let holder_balance = balance(&env, to.clone());
        set_balance(&env, to, checked_add(&env, holder_balance, amount));
        env.storage()
            .persistent()
            .set(&DataKey::TotalSupply, &checked_add(&env, supply, amount));
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        admin(&env).require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let holder_balance = balance(&env, from.clone());
        if holder_balance < amount {
            panic_with_error!(&env, Error::InsufficientBalance);
        }
        let supply = Self::total_supply(env.clone());
        set_balance(&env, from, checked_sub(&env, holder_balance, amount));
        env.storage()
            .persistent()
            .set(&DataKey::TotalSupply, &checked_sub(&env, supply, amount));
    }
}

mod test;
