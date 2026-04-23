#![no_std]
use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype,
    panic_with_error, Address, Env,
};

#[contract]
pub struct StreamVault;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StreamStatus {
    Active,
    Cancelled,
    Completed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Stream {
    pub sender: Address,
    pub recipient: Address,
    pub token: Address,
    pub rate_per_second: i128,
    pub total_deposit: i128,
    pub already_withdrawn: i128,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
    pub status: StreamStatus,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    NextStreamId,
    Stream(u64),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidRate = 1,
    InvalidDuration = 2,
    Overflow = 3,
    StreamNotFound = 4,
    StreamInactive = 5,
    NoClaimable = 6,
    ArithmeticUnderflow = 7,
    RecipientIsContract = 8,
}

#[contractevent(topics = ["StreamCreated"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StreamCreatedEvent {
    pub stream_id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub token: Address,
    pub rate_per_second: i128,
    pub total_deposit: i128,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
}

#[contractevent(topics = ["Withdrawal"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawalEvent {
    pub stream_id: u64,
    pub recipient: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contractevent(topics = ["StreamCancelled"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StreamCancelledEvent {
    pub stream_id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub recipient_owed: i128,
    pub sender_refund: i128,
    pub timestamp: u64,
}

#[contractclient(name = "TokenClient")]
pub trait TokenContract {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
}

const BUMP_THRESHOLD: u32 = 30 * 17280; // 30 days
const BUMP_AMOUNT: u32 = 30 * 17280; // 30 days

fn read_next_stream_id(env: &Env) -> u64 {
    let key = DataKey::NextStreamId;
    match env.storage().persistent().get(&key) {
        Some(val) => {
            env.storage()
                .persistent()
                .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
            val
        }
        None => 0,
    }
}

fn write_next_stream_id(env: &Env, next_id: u64) {
    let key = DataKey::NextStreamId;
    env.storage().persistent().set(&key, &next_id);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn read_stream(env: &Env, stream_id: u64) -> Stream {
    let key = DataKey::Stream(stream_id);
    let val = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| panic_with_error!(env, Error::StreamNotFound));
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
    val
}

fn write_stream(env: &Env, stream_id: u64, stream: &Stream) {
    let key = DataKey::Stream(stream_id);
    env.storage().persistent().set(&key, stream);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn checked_mul_i128(env: &Env, a: i128, b: i128) -> i128 {
    a.checked_mul(b)
        .unwrap_or_else(|| panic_with_error!(env, Error::Overflow))
}

fn checked_add_u64(env: &Env, a: u64, b: u64) -> u64 {
    a.checked_add(b)
        .unwrap_or_else(|| panic_with_error!(env, Error::Overflow))
}

fn checked_add_i128(env: &Env, a: i128, b: i128) -> i128 {
    a.checked_add(b)
        .unwrap_or_else(|| panic_with_error!(env, Error::Overflow))
}

fn checked_sub_i128(env: &Env, a: i128, b: i128) -> i128 {
    a.checked_sub(b)
        .unwrap_or_else(|| panic_with_error!(env, Error::ArithmeticUnderflow))
}

fn compute_claimable(env: &Env, stream: &Stream, now: u64) -> i128 {
    if stream.status != StreamStatus::Active {
        return 0;
    }

    let capped_now = if now > stream.end_timestamp {
        stream.end_timestamp
    } else {
        now
    };

    if capped_now <= stream.start_timestamp {
        return 0;
    }

    // Core accrual math:
    // claimable = (min(now, end) - start) * rate - already_withdrawn
    let elapsed = capped_now - stream.start_timestamp;
    let accrued = checked_mul_i128(env, stream.rate_per_second, elapsed as i128);

    let raw_claimable = match accrued.checked_sub(stream.already_withdrawn) {
        Some(v) => v,
        None => return 0,
    };
    if raw_claimable <= 0 {
        return 0;
    }

    let remaining = match stream.total_deposit.checked_sub(stream.already_withdrawn) {
        Some(v) => v,
        None => return 0,
    };

    if remaining <= 0 {
        return 0;
    }

    if raw_claimable > remaining {
        remaining
    } else {
        raw_claimable
    }
}

#[contractimpl]
impl StreamVault {
    pub fn create_stream(
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        rate_per_second: i128,
        duration_seconds: u64,
    ) -> u64 {
        sender.require_auth();

        if recipient == env.current_contract_address() {
            panic_with_error!(&env, Error::RecipientIsContract);
        }

        if rate_per_second <= 0 {
            panic_with_error!(&env, Error::InvalidRate);
        }
        if duration_seconds == 0 {
            panic_with_error!(&env, Error::InvalidDuration);
        }

        let total_deposit = checked_mul_i128(&env, rate_per_second, duration_seconds as i128);
        let start_timestamp = env.ledger().timestamp();
        let end_timestamp = checked_add_u64(&env, start_timestamp, duration_seconds);

        let stream_id = read_next_stream_id(&env);
        write_next_stream_id(
            &env,
            stream_id
                .checked_add(1)
                .unwrap_or_else(|| panic_with_error!(&env, Error::Overflow)),
        );

        let stream = Stream {
            sender: sender.clone(),
            recipient: recipient.clone(),
            token: token.clone(),
            rate_per_second,
            total_deposit,
            already_withdrawn: 0,
            start_timestamp,
            end_timestamp,
            status: StreamStatus::Active,
        };
        write_stream(&env, stream_id, &stream);

        let token_client = TokenClient::new(&env, &token);
        token_client.transfer(&sender, &env.current_contract_address(), &total_deposit);

        StreamCreatedEvent {
            stream_id,
            sender,
            recipient,
            token,
            rate_per_second,
            total_deposit,
            start_timestamp,
            end_timestamp,
        }
        .publish(&env);

        stream_id
    }

    pub fn get_claimable(env: Env, stream_id: u64) -> i128 {
        let stream = read_stream(&env, stream_id);
        compute_claimable(&env, &stream, env.ledger().timestamp())
    }

    pub fn withdraw(env: Env, stream_id: u64) -> i128 {
        let mut stream = read_stream(&env, stream_id);
        if stream.status != StreamStatus::Active {
            panic_with_error!(&env, Error::StreamInactive);
        }

        stream.recipient.require_auth();

        let claimable = compute_claimable(&env, &stream, env.ledger().timestamp());
        if claimable <= 0 {
            panic_with_error!(&env, Error::NoClaimable);
        }

        stream.already_withdrawn = checked_add_i128(&env, stream.already_withdrawn, claimable);
        if stream.already_withdrawn >= stream.total_deposit {
            stream.status = StreamStatus::Completed;
        }
        write_stream(&env, stream_id, &stream);

        let token_client = TokenClient::new(&env, &stream.token);
        token_client.transfer(
            &env.current_contract_address(),
            &stream.recipient,
            &claimable,
        );

        WithdrawalEvent {
            stream_id,
            recipient: stream.recipient,
            amount: claimable,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);

        claimable
    }

    pub fn cancel(env: Env, stream_id: u64) -> (i128, i128) {
        let mut stream = read_stream(&env, stream_id);
        if stream.status != StreamStatus::Active {
            panic_with_error!(&env, Error::StreamInactive);
        }
        if env.ledger().timestamp() >= stream.end_timestamp {
            panic_with_error!(&env, Error::StreamInactive);
        }

        stream.sender.require_auth();

        let recipient_owed = compute_claimable(&env, &stream, env.ledger().timestamp());
        let total_paid_after_cancel =
            checked_add_i128(&env, stream.already_withdrawn, recipient_owed);
        let sender_refund = checked_sub_i128(&env, stream.total_deposit, total_paid_after_cancel);

        stream.already_withdrawn = total_paid_after_cancel;
        stream.status = StreamStatus::Cancelled;
        write_stream(&env, stream_id, &stream);

        let token_client = TokenClient::new(&env, &stream.token);
        if recipient_owed > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &stream.recipient,
                &recipient_owed,
            );
        }
        if sender_refund > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &stream.sender,
                &sender_refund,
            );
        }

        StreamCancelledEvent {
            stream_id,
            sender: stream.sender,
            recipient: stream.recipient,
            recipient_owed,
            sender_refund,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);

        (recipient_owed, sender_refund)
    }

    pub fn get_stream(env: Env, stream_id: u64) -> Stream {
        read_stream(&env, stream_id)
    }

    pub fn get_stream_count(env: Env) -> u64 {
        read_next_stream_id(&env)
    }
}

mod test;
