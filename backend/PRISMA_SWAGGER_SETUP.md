# Prisma and Swagger Integration Guide

This guide will help you set up Prisma for database management and Swagger for API documentation in your KaryoAI backend.

## Prerequisites

- Node.js (v16 or higher)
- MySQL database
- npm or yarn package manager

## Step 1: Environment Setup

Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/karyoai_db"

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Important:** Replace `username`, `password`, `localhost`, `3306`, and `karyoai_db` with your actual database credentials.

## Step 2: Database Setup

1. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

2. **Push Schema to Database:**
   ```bash
   npm run db:push
   ```

3. **Create Migration (Optional):**
   ```bash
   npm run db:migrate
   ```

## Step 3: Start the Development Server

```bash
npm run dev
```

## Step 4: Access Swagger Documentation

Once the server is running, you can access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create and apply migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Run database seeding

## Database Models

The following models are available in Prisma:

- **User** - User accounts and authentication
- **Admin** - Admin accounts
- **Payment** - Payment records
- **ExcelAnalysis** - Excel analysis results
- **Chat** - Chat sessions
- **ChatMessage** - Chat messages
- **PdfChat** - PDF chat sessions
- **PdfChatMessage** - PDF chat messages

## API Documentation

### Authentication Endpoints

- `POST /api/user/signup` - Register new user
- `POST /api/user/login` - User login
- `GET /api/user/me` - Get current user (protected)

### Admin Endpoints

- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - Get all users (admin only)

### Premium Features

- `GET /api/premium/features` - Get premium features
- `POST /api/premium/upgrade` - Upgrade to premium

## Migration from Old MySQL Models

To migrate from the old MySQL models to Prisma:

1. **Update Controllers:** Replace direct database queries with Prisma client calls
2. **Update Services:** Use the new service classes with Prisma
3. **Test Thoroughly:** Ensure all functionality works with the new setup

## Example Usage

### Using Prisma in Controllers

```typescript
import { UserService } from '../services/userService';

export const signup = async (req: Request, res: Response) => {
  try {
    const userData = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      plan: req.body.plan
    };

    const user = await UserService.createUser(userData);
    
    res.status(201).json({
      user,
      accessToken: generateToken(user.id)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
```

### Adding Swagger Documentation

```typescript
/**
 * @swagger
 * /api/user/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
export const signup = async (req: Request, res: Response) => {
  // Implementation
};
```

## Troubleshooting

### Common Issues

1. **Database Connection Error:**
   - Check your DATABASE_URL in .env
   - Ensure MySQL server is running
   - Verify database credentials

2. **Prisma Client Not Generated:**
   - Run `npm run db:generate`
   - Check if schema.prisma is valid

3. **Swagger Not Loading:**
   - Ensure all dependencies are installed
   - Check if the server is running on the correct port

### Getting Help

- Prisma Documentation: https://www.prisma.io/docs
- Swagger Documentation: https://swagger.io/docs
- OpenAPI Specification: https://swagger.io/specification

## Next Steps

1. **Add More API Documentation:** Document all your endpoints with Swagger
2. **Implement Middleware:** Add authentication and validation middleware
3. **Add Error Handling:** Implement comprehensive error handling
4. **Add Testing:** Set up unit and integration tests
5. **Add Logging:** Implement proper logging for debugging 