#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
    String, Vec,
};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BillCreatedEvent {
    #[topic]
    pub bill_id: u64,
    pub group_id: u64,
    pub total_amount: i128,
    pub participant_count: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SharePaidEvent {
    #[topic]
    pub bill_id: u64,
    pub participant: Address,
    pub amount_paid: i128,
    pub outstanding_amount: i128,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RabaError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    BillAlreadyExists = 3,
    BillNotFound = 4,
    BillAlreadySettled = 5,
    InvalidTotalAmount = 6,
    InvalidParticipants = 7,
    SharesMismatch = 8,
    ParticipantNotFound = 9,
    ShareAlreadyPaid = 10,
    InvalidPaymentAmount = 11,
    DuplicateTxReference = 12,
    Unauthorized = 13,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum SplitType {
    Equal = 0,
    Custom = 1,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum BillStatus {
    Open = 0,
    PartiallyPaid = 1,
    Settled = 2,
    Cancelled = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ParticipantShare {
    pub participant: Address,
    pub amount_due: i128,
    pub amount_paid: i128,
    pub is_paid: bool,
    pub tx_reference: String,
    pub paid_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bill {
    pub bill_id: u64,
    pub group_id: u64,
    pub creator: Address,
    pub recipient: Address,
    pub token: Address,
    pub description: String,
    pub total_amount: i128,
    pub total_paid: i128,
    pub outstanding_amount: i128,
    pub split_type: SplitType,
    pub status: BillStatus,
    pub participant_count: u32,
    pub paid_count: u32,
    pub created_at: u64,
    pub settled_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    DefaultToken,
    BillCount,
    Bill(u64),
    BillParticipants(u64),
    ParticipantShare(u64, Address),
    SettledTxRef(String),
}

#[contract]
pub struct RabaPayContract;

#[contractimpl]
impl RabaPayContract {
    /// Initialize the RabaPay settlement contract with an admin and default simulated USDC token address.
    pub fn initialize(env: Env, admin: Address, default_token: Address) -> Result<(), RabaError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(RabaError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::DefaultToken, &default_token);
        env.storage().instance().set(&DataKey::BillCount, &0u64);
        Ok(())
    }

    /// Create a shared bill with equal splitting among participants.
    /// Distributes any integer division remainder (+1 stroop) to the earliest participants so sum of shares == total_amount.
    pub fn create_bill_equal(
        env: Env,
        creator: Address,
        bill_id: u64,
        group_id: u64,
        recipient: Address,
        token: Address,
        description: String,
        total_amount: i128,
        participants: Vec<Address>,
    ) -> Result<Bill, RabaError> {
        creator.require_auth();
        if total_amount <= 0 {
            return Err(RabaError::InvalidTotalAmount);
        }
        let count = participants.len();
        if count == 0 {
            return Err(RabaError::InvalidParticipants);
        }
        if env.storage().persistent().has(&DataKey::Bill(bill_id)) {
            return Err(RabaError::BillAlreadyExists);
        }

        let base_share = total_amount / (count as i128);
        let remainder = total_amount % (count as i128);
        if base_share <= 0 && remainder == 0 {
            return Err(RabaError::InvalidTotalAmount);
        }

        let mut shares = Vec::new(&env);
        for i in 0..count {
            let extra = if (i as i128) < remainder { 1i128 } else { 0i128 };
            let share_amount = base_share + extra;
            if share_amount <= 0 {
                return Err(RabaError::InvalidTotalAmount);
            }
            shares.push_back(share_amount);
        }

        Self::store_bill(
            &env,
            creator,
            bill_id,
            group_id,
            recipient,
            token,
            description,
            total_amount,
            SplitType::Equal,
            participants,
            shares,
        )
    }

    /// Create a shared bill with custom share amounts per participant.
    /// Validates that individual shares strictly sum to `total_amount`.
    pub fn create_bill_custom(
        env: Env,
        creator: Address,
        bill_id: u64,
        group_id: u64,
        recipient: Address,
        token: Address,
        description: String,
        total_amount: i128,
        participants: Vec<Address>,
        share_amounts: Vec<i128>,
    ) -> Result<Bill, RabaError> {
        creator.require_auth();
        if total_amount <= 0 {
            return Err(RabaError::InvalidTotalAmount);
        }
        let count = participants.len();
        if count == 0 || count != share_amounts.len() {
            return Err(RabaError::InvalidParticipants);
        }
        if env.storage().persistent().has(&DataKey::Bill(bill_id)) {
            return Err(RabaError::BillAlreadyExists);
        }

        let mut sum: i128 = 0;
        for i in 0..count {
            let amt = share_amounts.get(i).unwrap();
            if amt <= 0 {
                return Err(RabaError::InvalidPaymentAmount);
            }
            sum += amt;
        }
        if sum != total_amount {
            return Err(RabaError::SharesMismatch);
        }

        Self::store_bill(
            &env,
            creator,
            bill_id,
            group_id,
            recipient,
            token,
            description,
            total_amount,
            SplitType::Custom,
            participants,
            share_amounts,
        )
    }

    fn store_bill(
        env: &Env,
        creator: Address,
        bill_id: u64,
        group_id: u64,
        recipient: Address,
        token: Address,
        description: String,
        total_amount: i128,
        split_type: SplitType,
        participants: Vec<Address>,
        share_amounts: Vec<i128>,
    ) -> Result<Bill, RabaError> {
        let count = participants.len();
        // Check for duplicate participant addresses in the bill
        for i in 0..count {
            let p_i = participants.get(i).unwrap();
            for j in (i + 1)..count {
                let p_j = participants.get(j).unwrap();
                if p_i == p_j {
                    return Err(RabaError::InvalidParticipants);
                }
            }
        }

        for i in 0..count {
            let participant = participants.get(i).unwrap();
            let amount_due = share_amounts.get(i).unwrap();
            let share = ParticipantShare {
                participant: participant.clone(),
                amount_due,
                amount_paid: 0,
                is_paid: false,
                tx_reference: String::from_str(env, ""),
                paid_at: 0,
            };
            env.storage().persistent().set(
                &DataKey::ParticipantShare(bill_id, participant),
                &share,
            );
        }

        let now = env.ledger().timestamp();
        let bill = Bill {
            bill_id,
            group_id,
            creator,
            recipient,
            token,
            description,
            total_amount,
            total_paid: 0,
            outstanding_amount: total_amount,
            split_type,
            status: BillStatus::Open,
            participant_count: count,
            paid_count: 0,
            created_at: now,
            settled_at: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Bill(bill_id), &bill);
        env.storage()
            .persistent()
            .set(&DataKey::BillParticipants(bill_id), &participants);

        let current_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::BillCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::BillCount, &(current_count + 1));

        BillCreatedEvent {
            bill_id,
            group_id: bill.group_id,
            total_amount: bill.total_amount,
            participant_count: bill.participant_count,
        }
        .publish(env);

        Ok(bill)
    }

    /// Pay a participant's share using the bill's simulated USDC token (SAC/SEP-41).
    /// Transfers `share.amount_due` directly from `participant` to `bill.recipient`,
    /// updates participant share status, rejects duplicate payments or tx references,
    /// and automatically marks the bill as `Settled` when all shares are paid.
    pub fn pay_share(
        env: Env,
        bill_id: u64,
        participant: Address,
        tx_reference: String,
    ) -> Result<Bill, RabaError> {
        participant.require_auth();

        if tx_reference.len() > 0
            && env
                .storage()
                .persistent()
                .has(&DataKey::SettledTxRef(tx_reference.clone()))
        {
            return Err(RabaError::DuplicateTxReference);
        }

        let mut bill: Bill = env
            .storage()
            .persistent()
            .get(&DataKey::Bill(bill_id))
            .ok_or(RabaError::BillNotFound)?;

        if bill.status == BillStatus::Settled {
            return Err(RabaError::BillAlreadySettled);
        }

        let share_key = DataKey::ParticipantShare(bill_id, participant.clone());
        let mut share: ParticipantShare = env
            .storage()
            .persistent()
            .get(&share_key)
            .ok_or(RabaError::ParticipantNotFound)?;

        if share.is_paid {
            return Err(RabaError::ShareAlreadyPaid);
        }

        // Transfer simulated USDC tokens from participant to recipient if participant != recipient
        if participant != bill.recipient {
            let token_client = token::Client::new(&env, &bill.token);
            token_client.transfer(&participant, &bill.recipient, &share.amount_due);
        }

        let now = env.ledger().timestamp();
        share.amount_paid = share.amount_due;
        share.is_paid = true;
        share.tx_reference = tx_reference.clone();
        share.paid_at = now;

        env.storage().persistent().set(&share_key, &share);
        if tx_reference.len() > 0 {
            env.storage()
                .persistent()
                .set(&DataKey::SettledTxRef(tx_reference), &bill_id);
        }

        bill.total_paid += share.amount_due;
        bill.outstanding_amount = bill.total_amount - bill.total_paid;
        bill.paid_count += 1;

        if bill.paid_count == bill.participant_count && bill.outstanding_amount == 0 {
            bill.status = BillStatus::Settled;
            bill.settled_at = now;
        } else {
            bill.status = BillStatus::PartiallyPaid;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Bill(bill_id), &bill);

        SharePaidEvent {
            bill_id,
            participant,
            amount_paid: share.amount_due,
            outstanding_amount: bill.outstanding_amount,
        }
        .publish(&env);

        Ok(bill)
    }

    /// Record an already verified off-chain/direct Stellar USDC transfer for a participant's share.
    /// Can be called by the participant, bill recipient, or contract admin.
    /// Strictly rejects duplicate settlement records and duplicate transaction hashes.
    pub fn record_verified_payment(
        env: Env,
        caller: Address,
        bill_id: u64,
        participant: Address,
        amount: i128,
        tx_reference: String,
    ) -> Result<Bill, RabaError> {
        caller.require_auth();

        if tx_reference.len() == 0 {
            return Err(RabaError::DuplicateTxReference);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::SettledTxRef(tx_reference.clone()))
        {
            return Err(RabaError::DuplicateTxReference);
        }

        let mut bill: Bill = env
            .storage()
            .persistent()
            .get(&DataKey::Bill(bill_id))
            .ok_or(RabaError::BillNotFound)?;

        let admin: Option<Address> = env.storage().instance().get(&DataKey::Admin);
        let is_authorized = caller == participant
            || caller == bill.recipient
            || caller == bill.creator
            || (admin.is_some() && admin.unwrap() == caller);
        if !is_authorized {
            return Err(RabaError::Unauthorized);
        }

        if bill.status == BillStatus::Settled {
            return Err(RabaError::BillAlreadySettled);
        }

        let share_key = DataKey::ParticipantShare(bill_id, participant.clone());
        let mut share: ParticipantShare = env
            .storage()
            .persistent()
            .get(&share_key)
            .ok_or(RabaError::ParticipantNotFound)?;

        if share.is_paid {
            return Err(RabaError::ShareAlreadyPaid);
        }
        if amount != share.amount_due {
            return Err(RabaError::InvalidPaymentAmount);
        }

        let now = env.ledger().timestamp();
        share.amount_paid = amount;
        share.is_paid = true;
        share.tx_reference = tx_reference.clone();
        share.paid_at = now;

        env.storage().persistent().set(&share_key, &share);
        env.storage()
            .persistent()
            .set(&DataKey::SettledTxRef(tx_reference), &bill_id);

        bill.total_paid += amount;
        bill.outstanding_amount = bill.total_amount - bill.total_paid;
        bill.paid_count += 1;

        if bill.paid_count == bill.participant_count && bill.outstanding_amount == 0 {
            bill.status = BillStatus::Settled;
            bill.settled_at = now;
        } else {
            bill.status = BillStatus::PartiallyPaid;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Bill(bill_id), &bill);

        Ok(bill)
    }

    pub fn get_bill(env: Env, bill_id: u64) -> Result<Bill, RabaError> {
        env.storage()
            .persistent()
            .get(&DataKey::Bill(bill_id))
            .ok_or(RabaError::BillNotFound)
    }

    pub fn get_share(
        env: Env,
        bill_id: u64,
        participant: Address,
    ) -> Result<ParticipantShare, RabaError> {
        env.storage()
            .persistent()
            .get(&DataKey::ParticipantShare(bill_id, participant))
            .ok_or(RabaError::ParticipantNotFound)
    }

    pub fn get_bill_shares(env: Env, bill_id: u64) -> Result<Vec<ParticipantShare>, RabaError> {
        let participants: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::BillParticipants(bill_id))
            .ok_or(RabaError::BillNotFound)?;

        let mut shares = Vec::new(&env);
        for i in 0..participants.len() {
            let p = participants.get(i).unwrap();
            let s: ParticipantShare = env
                .storage()
                .persistent()
                .get(&DataKey::ParticipantShare(bill_id, p))
                .ok_or(RabaError::ParticipantNotFound)?;
            shares.push_back(s);
        }
        Ok(shares)
    }

    pub fn is_tx_used(env: Env, tx_reference: String) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::SettledTxRef(tx_reference))
    }

    pub fn get_bill_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::BillCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
