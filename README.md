# RabaPay — Shared Expense & Bill-Splitting Platform on Stellar Testnet

RabaPay is a shared expense and bill-splitting platform that allows friends, roommates, colleagues, and groups to divide bills equally or by custom amounts and settle their individual shares using simulated USDC on **Stellar Testnet** powered by a **Soroban Smart Contract** and a **Django REST + Celery + Redis** backend.

---

## Live Stellar Testnet Deployment

- **Network**: Stellar Testnet (`Test SDF Network ; September 2015`)
- **Soroban RPC**: `https://soroban-testnet.stellar.org`
- **Horizon API**: `https://horizon-testnet.stellar.org`
- **Deployed RabaPay Settlement Contract ID**: `CCDT474DVAO4LYDJ7UE4ZPPBN6UBNJHIRPCYAK3TEOHFGC46KNNEOEPK`
- **WASM Hash**: `61acea4a809af90393d36748f95de4c5ff5ed9266ebf88da9067fb12ad9d4442`
- **Contract Deployment Tx Hash**: `9864ab6206833fb5d1f77db3f3c6ef220e14428fcaf44fecdff4b29c8fef7200`
- **Contract Initialization Tx Hash**: `0f033a3d10696d1ac5cb280ecbdcabac6ee6bfc0a61c2c6e64ce935330676cf5`
- **Simulated USDC SAC Contract ID**: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`

---

## Architecture & Tech Stack

1. **Django 5 & Django REST Framework (`backend/`)**
   - Custom `User` model with non-custodial Stellar Testnet wallet connection (`G...` public key).
   - `ExpenseGroup` & `GroupMembership` for creating expense groups and inviting participants by user ID, username, email, or Stellar wallet address.
   - `SharedBill` & `BillShare` supporting exact 7-decimal (stroop-level) **Equal** and **Custom** bill splitting with strict sum validation (`sum(shares) == total_amount`).
   - `StellarSettlementTransaction` for verifying Stellar Testnet simulated USDC payments, tracking paid/unpaid participants, calculating outstanding balances, marking fully paid bills as `SETTLED`, and rejecting duplicate settlement records or duplicate transaction hashes.
2. **Soroban Smart Contract (`smart_contract/contracts/rabapay_settlement/`)**
   - Written in Rust using `soroban-sdk 28.0.0`.
   - Exported functions: `initialize`, `create_bill_equal`, `create_bill_custom`, `pay_share`, `record_verified_payment`, `get_bill`, `get_share`, `get_bill_shares`, `is_tx_used`, `get_bill_count`.
3. **Redis & Celery (`backend/config/celery.py`, `backend/core/tasks.py`)**
   - Asynchronous and synchronous Stellar Testnet transaction verification (`verify_and_settle_payment_task`) and group balance reconciliation (`recalculate_group_balances_task`).
4. **OpenAPI 3 / Swagger Documentation (`drf-spectacular`)**
   - Interactive Swagger UI: `/api/docs/`
   - ReDoc UI: `/api/redoc/`
   - OpenAPI 3 Schema: `/api/schema/`
5. **Docker & Environment Configuration**
   - `docker-compose.yml` orchestrating PostgreSQL 16 (`db`), Redis 7 (`redis`), Django + Gunicorn (`backend`), and Celery Worker (`celery_worker`), driven by `.env`.

---

## Quick Start

### 1. Run with Docker Compose

```bash
docker compose up --build -d
```

### 2. Local Development & Running Tests

**Smart Contract Tests:**
```bash
cd smart_contract
cargo test
stellar contract build
```

**Backend Tests:**
```bash
cd backend
.venv/bin/python manage.py test
```
