#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, panic_with_error, Address,
    Env, Vec,
};

#[contract]
pub struct StreamFactory;

#[contractclient(name = "StreamVaultClient")]
pub trait StreamVaultContract {
    fn create_stream(
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        rate_per_second: i128,
        duration_seconds: u64,
    ) -> u64;
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    NextStreamId,
    Sender(Address),
    Recipient(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Overflow = 1,
}

const BUMP_THRESHOLD: u32 = 30 * 17280;
const BUMP_AMOUNT: u32 = 30 * 17280;

fn read_next_stream_id(env: &Env) -> u64 {
    env.storage()
        .persistent()
        .get(&DataKey::NextStreamId)
        .unwrap_or(0)
}

fn write_next_stream_id(env: &Env, next_id: u64) {
    let key = DataKey::NextStreamId;
    env.storage().persistent().set(&key, &next_id);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn push_registry(env: &Env, key: DataKey, stream_id: u64) {
    let mut ids = env
        .storage()
        .persistent()
        .get::<DataKey, Vec<u64>>(&key)
        .unwrap_or_else(|| Vec::new(env));
    ids.push_back(stream_id);
    env.storage().persistent().set(&key, &ids);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

#[contractimpl]
impl StreamFactory {
    pub fn create_stream(
        env: Env,
        sender: Address,
        vault: Address,
        recipient: Address,
        token: Address,
        rate_per_second: i128,
        duration_seconds: u64,
    ) -> u64 {
        sender.require_auth();

        let factory_stream_id = read_next_stream_id(&env);
        write_next_stream_id(
            &env,
            factory_stream_id
                .checked_add(1)
                .unwrap_or_else(|| panic_with_error!(&env, Error::Overflow)),
        );

        let vault_client = StreamVaultClient::new(&env, &vault);
        let vault_stream_id = vault_client.create_stream(
            &sender,
            &recipient,
            &token,
            &rate_per_second,
            &duration_seconds,
        );

        push_registry(&env, DataKey::Sender(sender), vault_stream_id);
        push_registry(&env, DataKey::Recipient(recipient), vault_stream_id);

        vault_stream_id
    }

    pub fn get_streams_by_sender(env: Env, sender: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::Sender(sender))
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_streams_by_recipient(env: Env, recipient: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::Recipient(recipient))
            .unwrap_or_else(|| Vec::new(&env))
    }
}

mod test;
