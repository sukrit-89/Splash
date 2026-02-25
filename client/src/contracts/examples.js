/**
 * Example Soroban Contracts Library
 * Pre-built contracts for learning and deployment
 */

export const CONTRACT_EXAMPLES = {
  counter: {
    name: "Counter",
    description: "Simple counter with increment/decrement",
    difficulty: "Beginner",
    code: `#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol};

const COUNTER: Symbol = Symbol::short("COUNTER");

#[contract]
pub struct CounterContract;

#[contractimpl]
impl CounterContract {
    /// Initialize counter to 0
    pub fn initialize(env: Env) {
        env.storage().instance().set(&COUNTER, &0i32);
    }

    /// Increment counter by 1
    pub fn increment(env: Env) -> i32 {
        let mut count: i32 = env.storage().instance().get(&COUNTER).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&COUNTER, &count);
        count
    }

    /// Decrement counter by 1
    pub fn decrement(env: Env) -> i32 {
        let mut count: i32 = env.storage().instance().get(&COUNTER).unwrap_or(0);
        count -= 1;
        env.storage().instance().set(&COUNTER, &count);
        count
    }

    /// Get current counter value
    pub fn get_count(env: Env) -> i32 {
        env.storage().instance().get(&COUNTER).unwrap_or(0)
    }

    /// Reset counter to 0
    pub fn reset(env: Env) {
        env.storage().instance().set(&COUNTER, &0i32);
    }
}`,
    functions: [
      { name: "initialize", params: [], returns: "void", description: "Initialize counter" },
      { name: "increment", params: [], returns: "i32", description: "Add 1 to counter" },
      { name: "decrement", params: [], returns: "i32", description: "Subtract 1 from counter" },
      { name: "get_count", params: [], returns: "i32", description: "Read current value" },
      { name: "reset", params: [], returns: "void", description: "Reset to 0" }
    ]
  },

  token: {
    name: "Simple Token",
    description: "Basic token with minting and transfers",
    difficulty: "Intermediate",
    code: `#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, symbol_short};

#[contracttype]
#[derive(Clone)]
pub struct TokenInfo {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
}

#[contract]
pub struct TokenContract;

const BALANCE: symbol_short!("BALANCE");
const ADMIN: symbol_short!("ADMIN");
const INFO: symbol_short!("INFO");

#[contractimpl]
impl TokenContract {
    /// Initialize token with name, symbol, decimals
    pub fn initialize(env: Env, admin: Address, name: String, symbol: String, decimals: u32) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Already initialized");
        }
        
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&INFO, &TokenInfo {
            name,
            symbol,
            decimals,
        });
    }

    /// Mint tokens to an address
    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        admin.require_auth();

        let balance = Self::balance(env.clone(), to.clone());
        env.storage().instance().set(&(BALANCE, to), &(balance + amount));
    }

    /// Transfer tokens
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let from_balance = Self::balance(env.clone(), from.clone());
        let to_balance = Self::balance(env.clone(), to.clone());

        if from_balance < amount {
            panic!("Insufficient balance");
        }

        env.storage().instance().set(&(BALANCE, from), &(from_balance - amount));
        env.storage().instance().set(&(BALANCE, to), &(to_balance + amount));
    }

    /// Get balance of address
    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage().instance().get(&(BALANCE, account)).unwrap_or(0)
    }

    /// Get token info
    pub fn get_info(env: Env) -> TokenInfo {
        env.storage().instance().get(&INFO).unwrap()
    }
}`,
    functions: [
      { name: "initialize", params: ["admin: Address", "name: String", "symbol: String", "decimals: u32"], returns: "void", description: "Initialize token" },
      { name: "mint", params: ["to: Address", "amount: i128"], returns: "void", description: "Mint new tokens" },
      { name: "transfer", params: ["from: Address", "to: Address", "amount: i128"], returns: "void", description: "Transfer tokens" },
      { name: "balance", params: ["account: Address"], returns: "i128", description: "Get balance" },
      { name: "get_info", params: [], returns: "TokenInfo", description: "Get token metadata" }
    ]
  },

  escrow: {
    name: "Escrow Contract",
    description: "Secure escrow for transactions with arbitrator",
    difficulty: "Advanced",
    code: `#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, symbol_short};

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum EscrowState {
    Created,
    Funded,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone)]
pub struct Escrow {
    pub buyer: Address,
    pub seller: Address,
    pub arbitrator: Address,
    pub amount: i128,
    pub state: EscrowState,
}

#[contract]
pub struct EscrowContract;

const ESCROW: symbol_short!("ESCROW");

#[contractimpl]
impl EscrowContract {
    /// Create escrow
    pub fn create(env: Env, buyer: Address, seller: Address, arbitrator: Address, amount: i128) {
        buyer.require_auth();

        let escrow = Escrow {
            buyer: buyer.clone(),
            seller,
            arbitrator,
            amount,
            state: EscrowState::Created,
        };

        env.storage().instance().set(&ESCROW, &escrow);
    }

    /// Fund escrow (buyer deposits)
    pub fn fund(env: Env) {
        let mut escrow: Escrow = env.storage().instance().get(&ESCROW).unwrap();
        escrow.buyer.require_auth();

        if escrow.state != EscrowState::Created {
            panic!("Invalid state");
        }

        escrow.state = EscrowState::Funded;
        env.storage().instance().set(&ESCROW, &escrow);
    }

    /// Release funds to seller
    pub fn release(env: Env) {
        let mut escrow: Escrow = env.storage().instance().get(&ESCROW).unwrap();
        
        // Only buyer or arbitrator can release
        let caller_is_buyer = env.current_contract_address() == escrow.buyer;
        let caller_is_arbitrator = env.current_contract_address() == escrow.arbitrator;
        
        if !caller_is_buyer && !caller_is_arbitrator {
            panic!("Unauthorized");
        }

        if escrow.state != EscrowState::Funded {
            panic!("Invalid state");
        }

        escrow.state = EscrowState::Released;
        env.storage().instance().set(&ESCROW, &escrow);
    }

    /// Refund to buyer
    pub fn refund(env: Env) {
        let mut escrow: Escrow = env.storage().instance().get(&ESCROW).unwrap();
        
        // Only seller or arbitrator can refund
        let caller_is_seller = env.current_contract_address() == escrow.seller;
        let caller_is_arbitrator = env.current_contract_address() == escrow.arbitrator;
        
        if !caller_is_seller && !caller_is_arbitrator {
            panic!("Unauthorized");
        }

        if escrow.state != EscrowState::Funded {
            panic!("Invalid state");
        }

        escrow.state = EscrowState::Refunded;
        env.storage().instance().set(&ESCROW, &escrow);
    }

    /// Get escrow details
    pub fn get_escrow(env: Env) -> Escrow {
        env.storage().instance().get(&ESCROW).unwrap()
    }
}`,
    functions: [
      { name: "create", params: ["buyer: Address", "seller: Address", "arbitrator: Address", "amount: i128"], returns: "void", description: "Create escrow" },
      { name: "fund", params: [], returns: "void", description: "Fund escrow (buyer)" },
      { name: "release", params: [], returns: "void", description: "Release to seller" },
      { name: "refund", params: [], returns: "void", description: "Refund to buyer" },
      { name: "get_escrow", params: [], returns: "Escrow", description: "Get escrow status" }
    ]
  },

  voting: {
    name: "Voting System",
    description: "On-chain voting with proposals",
    difficulty: "Intermediate",
    code: `#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short};

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub yes_votes: u32,
    pub no_votes: u32,
    pub active: bool,
}

#[contract]
pub struct VotingContract;

const PROPOSAL_COUNT: symbol_short!("PR_COUNT");
const PROPOSAL: symbol_short!("PROPOSAL");
const VOTED: symbol_short!("VOTED");

#[contractimpl]
impl VotingContract {
    /// Create a new proposal
    pub fn create_proposal(env: Env, creator: Address, title: String, description: String) -> u32 {
        creator.require_auth();

        let id: u32 = env.storage().instance().get(&PROPOSAL_COUNT).unwrap_or(0);
        let new_id = id + 1;

        let proposal = Proposal {
            id: new_id,
            title,
            description,
            yes_votes: 0,
            no_votes: 0,
            active: true,
        };

        env.storage().instance().set(&(PROPOSAL, new_id), &proposal);
        env.storage().instance().set(&PROPOSAL_COUNT, &new_id);

        new_id
    }

    /// Vote on a proposal
    pub fn vote(env: Env, voter: Address, proposal_id: u32, vote_yes: bool) {
        voter.require_auth();

        // Check if already voted
        let voted_key = (VOTED, proposal_id, voter.clone());
        if env.storage().instance().has(&voted_key) {
            panic!("Already voted");
        }

        // Get proposal
        let mut proposal: Proposal = env.storage().instance()
            .get(&(PROPOSAL, proposal_id))
            .unwrap();

        if !proposal.active {
            panic!("Proposal not active");
        }

        // Record vote
        if vote_yes {
            proposal.yes_votes += 1;
        } else {
            proposal.no_votes += 1;
        }

        env.storage().instance().set(&(PROPOSAL, proposal_id), &proposal);
        env.storage().instance().set(&voted_key, &true);
    }

    /// Close proposal
    pub fn close_proposal(env: Env, proposal_id: u32) {
        let mut proposal: Proposal = env.storage().instance()
            .get(&(PROPOSAL, proposal_id))
            .unwrap();

        proposal.active = false;
        env.storage().instance().set(&(PROPOSAL, proposal_id), &proposal);
    }

    /// Get proposal details
    pub fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        env.storage().instance().get(&(PROPOSAL, proposal_id)).unwrap()
    }

    /// Get total proposals
    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage().instance().get(&PROPOSAL_COUNT).unwrap_or(0)
    }
}`,
    functions: [
      { name: "create_proposal", params: ["creator: Address", "title: String", "description: String"], returns: "u32", description: "Create proposal" },
      { name: "vote", params: ["voter: Address", "proposal_id: u32", "vote_yes: bool"], returns: "void", description: "Cast vote" },
      { name: "close_proposal", params: ["proposal_id: u32"], returns: "void", description: "Close voting" },
      { name: "get_proposal", params: ["proposal_id: u32"], returns: "Proposal", description: "Get proposal" },
      { name: "get_proposal_count", params: [], returns: "u32", description: "Total proposals" }
    ]
  },

  hello_world: {
    name: "Hello World",
    description: "The simplest Soroban contract",
    difficulty: "Beginner",
    code: `#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, vec, Env, Symbol, Vec};

#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContract {
    /// Returns hello message
    pub fn hello(env: Env, to: Symbol) -> Vec<Symbol> {
        vec![&env, symbol_short!("Hello"), to]
    }
}`,
    functions: [
      { name: "hello", params: ["to: Symbol"], returns: "Vec<Symbol>", description: "Hello greeting" }
    ]
  }
};

export const getExamplesList = () => {
  return Object.keys(CONTRACT_EXAMPLES).map(key => ({
    id: key,
    name: CONTRACT_EXAMPLES[key].name,
    description: CONTRACT_EXAMPLES[key].description,
    difficulty: CONTRACT_EXAMPLES[key].difficulty
  }));
};

export const getExample = (id) => {
  return CONTRACT_EXAMPLES[id];
};
