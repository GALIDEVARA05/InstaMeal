# Campus Meal Card - Backend

## Setup
1. Install dependencies:
   cd backend
   npm install

2. Create `.env` from `.env.example` and configure MONGODB_URI and JWT_SECRET.

3. Start dev server:
   npm run dev

## API (selected)
POST /api/auth/register { name, email, password, role }  
POST /api/auth/login { email, password } -> { token }

POST /api/cards/create { studentId } (admin/manager)  
GET /api/cards/student/:studentId (auth)  
POST /api/cards/purchase { cardId, amount } (cashier)  
POST /api/cards/request-recharge { cardId, amount } (student)

GET /api/recharges/pending (manager)  
POST /api/recharges/process { requestId, action } (manager) action = approve|reject

GET /api/transactions/card/:cardId (auth)
GET /api/transactions/recent (auth)

## Business rules
- By default `AUTO_APPROVE_RECHARGES=false` means manager must approve recharges.
- Atomic operations are implemented using Mongoose transaction sessions to avoid concurrent race conditions.

## To change recharge auto-approval
Set `AUTO_APPROVE_RECHARGES=true` in `.env`.
