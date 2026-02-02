# KaryoAI Backend API

A scalable, secure backend for the KaryoAI SaaS platform using Node.js, Express, MySQL, JWT, and Zod.

## Features
- Signup & Login with strong validation (Zod)
- Password hashing (bcrypt)
- JWT authentication (access + refresh tokens)
- Role-based user model (admin, user)
- MySQL data persistence
- Secure headers, CORS
- Scalable folder structure

## Folder Structure
```
backend/
  ├── src/
  │   ├── config/
  │   ├── controllers/
  │   ├── middlewares/
  │   ├── models/
  │   ├── routes/
  │   ├── services/
  │   ├── utils/
  │   └── app.js
  ├── .env.example
  ├── package.json
  └── README.md
```

## Setup
1. Copy `.env.example` to `.env` and fill in your secrets and DB credentials.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run MySQL and create the database if not exists.
4. Start the server:
   ```bash
   npm run dev
   ```

## Environment Variables
See `.env.example` for all required variables.

## Security
- All sensitive routes are protected by JWT auth and role-based middleware.
- Passwords are hashed with bcrypt and a configurable salt.
- CORS and secure headers are enabled.

## API Reference
- `/api/auth/signup` — User registration
- `/api/auth/login` — User login
- `/api/auth/refresh` — Refresh JWT tokens
- `/api/admin/users` — Admin user management
- `/api/premium/*` — Premium feature access

## License
MIT 

## Database Setup
1. Create a MySQL database (e.g., `karyoai_prod`).
2. Run the SQL in `src/models/init.sql` to create the `users` table:
   ```bash
   mysql -u <user> -p <db_name> < src/models/init.sql
   ```
3. Copy `.env.example` to `.env` and fill in your credentials. 

## Razorpay Payment Integration

### Setup
1. Add your Razorpay API keys to a `.env` file:
   ```env
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   ```
2. The backend exposes a secure order creation endpoint at `/api/razorpay/create-order`.

### Security Best Practices
- **Never expose your secret key to the frontend.**
- All sensitive operations (order creation, verification) are handled server-side.
- Input validation is enforced using Zod.
- Use HTTPS in production to protect API keys and payment data.
- (Optional) Implement Razorpay webhook verification for payment signature validation. 