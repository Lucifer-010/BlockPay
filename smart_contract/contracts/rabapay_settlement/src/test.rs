use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String, Vec,
};

fn create_usdc_token<'a>(
    env: &Env,
    admin: &Address,
) -> (Address, token::Client<'a>, token::StellarAssetClient<'a>) {
    let contract_addr = env.register_stellar_asset_contract_v2(admin.clone());
    let addr = contract_addr.address();
    (
        addr.clone(),
        token::Client::new(env, &addr),
        token::StellarAssetClient::new(env, &addr),
    )
}

#[test]
fn test_initialize_and_prevent_reinit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(RabaPayContract, ());
    let client = RabaPayContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let (usdc_addr, _, _) = create_usdc_token(&env, &token_admin);

    client.initialize(&admin, &usdc_addr);
    assert_eq!(client.get_bill_count(), 0);

    let res = client.try_initialize(&admin, &usdc_addr);
    assert_eq!(res, Err(Ok(RabaError::AlreadyInitialized)));
}

#[test]
fn test_equal_split_and_full_usdc_settlement() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 1_700_000_000;
    });

    let contract_id = env.register(RabaPayContract, ());
    let client = RabaPayContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    let (usdc_addr, usdc_client, usdc_admin_client) = create_usdc_token(&env, &admin);
    client.initialize(&admin, &usdc_addr);

    // Mint 100 USDC (7 decimals = 1_000_000_000 stroops) to each participant
    usdc_admin_client.mint(&user1, &1_000_000_000);
    usdc_admin_client.mint(&user2, &1_000_000_000);
    usdc_admin_client.mint(&user3, &1_000_000_000);

    let mut participants = Vec::new(&env);
    participants.push_back(user1.clone());
    participants.push_back(user2.clone());
    participants.push_back(user3.clone());

    // Create a 100.0000000 USDC bill (1_000_000_000 stroops) split equally among 3 people
    // 333_333_334, 333_333_333, 333_333_333
    let bill = client.create_bill_equal(
        &creator,
        &101,
        &1,
        &recipient,
        &usdc_addr,
        &String::from_str(&env, "Apartment Utilities & Wi-Fi"),
        &1_000_000_000,
        &participants,
    );

    assert_eq!(bill.total_amount, 1_000_000_000);
    assert_eq!(bill.outstanding_amount, 1_000_000_000);
    assert_eq!(bill.status, BillStatus::Open);
    assert_eq!(bill.participant_count, 3);

    let s1 = client.get_share(&101, &user1);
    let s2 = client.get_share(&101, &user2);
    let s3 = client.get_share(&101, &user3);
    assert_eq!(s1.amount_due, 333_333_334);
    assert_eq!(s2.amount_due, 333_333_333);
    assert_eq!(s3.amount_due, 333_333_333);
    assert_eq!(s1.amount_due + s2.amount_due + s3.amount_due, 1_000_000_000);

    // User 1 pays share
    let bill = client.pay_share(&101, &user1, &String::from_str(&env, "tx_hash_user1_001"));
    assert_eq!(bill.status, BillStatus::PartiallyPaid);
    assert_eq!(bill.paid_count, 1);
    assert_eq!(bill.total_paid, 333_333_334);
    assert_eq!(bill.outstanding_amount, 666_666_666);
    assert_eq!(usdc_client.balance(&recipient), 333_333_334);

    // Duplicate payment by user 1 must be rejected
    let dup_pay = client.try_pay_share(&101, &user1, &String::from_str(&env, "tx_hash_user1_002"));
    assert_eq!(dup_pay, Err(Ok(RabaError::ShareAlreadyPaid)));

    // Duplicate transaction hash by user 2 must be rejected
    let dup_tx = client.try_pay_share(&101, &user2, &String::from_str(&env, "tx_hash_user1_001"));
    assert_eq!(dup_tx, Err(Ok(RabaError::DuplicateTxReference)));

    // User 2 pays share
    let bill = client.pay_share(&101, &user2, &String::from_str(&env, "tx_hash_user2_001"));
    assert_eq!(bill.status, BillStatus::PartiallyPaid);
    assert_eq!(bill.paid_count, 2);
    assert_eq!(bill.outstanding_amount, 333_333_333);

    // User 3 pays share -> Bill automatically settles
    let bill = client.pay_share(&101, &user3, &String::from_str(&env, "tx_hash_user3_001"));
    assert_eq!(bill.status, BillStatus::Settled);
    assert_eq!(bill.paid_count, 3);
    assert_eq!(bill.total_paid, 1_000_000_000);
    assert_eq!(bill.outstanding_amount, 0);
    assert_eq!(usdc_client.balance(&recipient), 1_000_000_000);
    assert!(client.is_tx_used(&String::from_str(&env, "tx_hash_user3_001")));
}

#[test]
fn test_custom_split_validation_and_settlement() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(RabaPayContract, ());
    let client = RabaPayContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let p1 = Address::generate(&env);
    let p2 = Address::generate(&env);

    let (usdc_addr, _, _) = create_usdc_token(&env, &admin);
    client.initialize(&admin, &usdc_addr);

    let mut participants = Vec::new(&env);
    participants.push_back(p1.clone());
    participants.push_back(p2.clone());

    // Mismatched shares sum (40 + 50 != 100) must fail with SharesMismatch
    let mut bad_shares = Vec::new(&env);
    bad_shares.push_back(400_000_000);
    bad_shares.push_back(500_000_000);

    let res = client.try_create_bill_custom(
        &creator,
        &202,
        &2,
        &recipient,
        &usdc_addr,
        &String::from_str(&env, "Team Dinner"),
        &1_000_000_000,
        &participants,
        &bad_shares,
    );
    assert_eq!(res, Err(Ok(RabaError::SharesMismatch)));

    // Valid custom shares (65 + 35 == 100)
    let mut good_shares = Vec::new(&env);
    good_shares.push_back(650_000_000);
    good_shares.push_back(350_000_000);

    let bill = client.create_bill_custom(
        &creator,
        &202,
        &2,
        &recipient,
        &usdc_addr,
        &String::from_str(&env, "Team Dinner"),
        &1_000_000_000,
        &participants,
        &good_shares,
    );
    assert_eq!(bill.split_type, SplitType::Custom);
    assert_eq!(bill.total_amount, 1_000_000_000);

    // Record verified payment from Horizon / Stellar Testnet
    let bill = client.record_verified_payment(
        &admin,
        &202,
        &p1,
        &650_000_000,
        &String::from_str(&env, "horizon_tx_001"),
    );
    assert_eq!(bill.status, BillStatus::PartiallyPaid);
    assert_eq!(bill.outstanding_amount, 350_000_000);

    // Reject wrong amount on record_verified_payment
    let wrong_amt = client.try_record_verified_payment(
        &admin,
        &202,
        &p2,
        &300_000_000,
        &String::from_str(&env, "horizon_tx_002"),
    );
    assert_eq!(wrong_amt, Err(Ok(RabaError::InvalidPaymentAmount)));

    // Complete final share
    let bill = client.record_verified_payment(
        &p2,
        &202,
        &p2,
        &350_000_000,
        &String::from_str(&env, "horizon_tx_002"),
    );
    assert_eq!(bill.status, BillStatus::Settled);
    assert_eq!(bill.outstanding_amount, 0);

    let all_shares = client.get_bill_shares(&202);
    assert_eq!(all_shares.len(), 2);
    assert!(all_shares.get(0).unwrap().is_paid);
    assert!(all_shares.get(1).unwrap().is_paid);
}

