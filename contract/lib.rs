#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Map, Symbol, Vec};

// Data structure for tracking user scores
#[contracttype]
#[derive(Clone)]
pub struct Player {
    pub address: Address,
    pub score: u32,
}

const SCORES: Symbol = symbol_short!("SCORES");
const LEADERBOARD: Symbol = symbol_short!("LEADERS");

#[contract]
pub struct TokenLeaderboard;

#[contractimpl]
impl TokenLeaderboard {
    /// Initialize the contract
    pub fn initialize(env: Env) {
        let scores: Map<Address, u32> = Map::new(&env);
        env.storage().persistent().set(&SCORES, &scores);
        
        let leaderboard: Vec<Player> = Vec::new(&env);
        env.storage().persistent().set(&LEADERBOARD, &leaderboard);
    }

    /// Claim tokens - adds points to user's score
    pub fn claim_tokens(env: Env, player: Address, amount: u32) -> u32 {
        player.require_auth();
        
        // Get current scores map
        let mut scores: Map<Address, u32> = env
            .storage()
            .persistent()
            .get(&SCORES)
            .unwrap_or(Map::new(&env));
        
        // Update player score
        let current_score = scores.get(player.clone()).unwrap_or(0);
        let new_score = current_score + amount;
        scores.set(player.clone(), new_score);
        
        // Save updated scores
        env.storage().persistent().set(&SCORES, &scores);
        
        // Update leaderboard
        Self::update_leaderboard(env.clone(), player.clone(), new_score);
        
        // Emit event
        env.events().publish(
            (symbol_short!("claim"), player.clone()),
            (amount, new_score),
        );
        
        new_score
    }

    /// Get a player's score
    pub fn get_score(env: Env, player: Address) -> u32 {
        let scores: Map<Address, u32> = env
            .storage()
            .persistent()
            .get(&SCORES)
            .unwrap_or(Map::new(&env));
        
        scores.get(player).unwrap_or(0)
    }

    /// Get the top N players
    pub fn get_leaderboard(env: Env, limit: u32) -> Vec<Player> {
        let leaderboard: Vec<Player> = env
            .storage()
            .persistent()
            .get(&LEADERBOARD)
            .unwrap_or(Vec::new(&env));
        
        let len = leaderboard.len();
        let actual_limit = if limit > len { len } else { limit };
        
        let mut result = Vec::new(&env);
        for i in 0..actual_limit {
            result.push_back(leaderboard.get(i).unwrap());
        }
        
        result
    }

    /// Internal function to update leaderboard
    fn update_leaderboard(env: Env, player: Address, score: u32) {
        let mut leaderboard: Vec<Player> = env
            .storage()
            .persistent()
            .get(&LEADERBOARD)
            .unwrap_or(Vec::new(&env));
        
        // Remove player if already in leaderboard
        let mut index_to_remove: Option<u32> = None;
        for i in 0..leaderboard.len() {
            let p = leaderboard.get(i).unwrap();
            if p.address == player {
                index_to_remove = Some(i);
                break;
            }
        }
        
        if let Some(idx) = index_to_remove {
            leaderboard.remove(idx);
        }
        
        // Insert player in sorted position
        let new_player = Player {
            address: player,
            score,
        };
        
        let mut inserted = false;
        let len = leaderboard.len();
        
        for i in 0..len {
            let p = leaderboard.get(i).unwrap();
            if score > p.score {
                leaderboard.insert(i, new_player.clone());
                inserted = true;
                break;
            }
        }
        
        if !inserted {
            leaderboard.push_back(new_player);
        }
        
        // Keep only top 10
        while leaderboard.len() > 10 {
            leaderboard.pop_back();
        }
        
        env.storage().persistent().set(&LEADERBOARD, &leaderboard);
    }

    /// Reset a player's score (admin function - for testing)
    pub fn reset_score(env: Env, player: Address) {
        player.require_auth();
        
        let mut scores: Map<Address, u32> = env
            .storage()
            .persistent()
            .get(&SCORES)
            .unwrap_or(Map::new(&env));
        
        scores.remove(player.clone());
        env.storage().persistent().set(&SCORES, &scores);
        
        Self::update_leaderboard(env, player, 0);
    }
}

#[cfg(test)]
mod test;
