# CampusAffordHub - the student market place

A Progressive Web App (PWA) designed as a mobile-installable marketplace connecting university students for buying and selling items. Built with React, TypeScript, Express, and PostgreSQL.

## 🚀 Features

- **Email Verification Authentication** - Secure OTP-based login system
- **Admin Dashboard** - Product approval and management system
- **Store Management** - Multi-store support per user
- **Product Catalog** - Category-based organization with search and filtering
- **Shopping Cart** - Persistent cart with real-time updates
- **Payment Processing** - Stripe integration (Card, PayPal, Mobile Money)
- **Messaging System** - User-to-user and product-specific communication
- **Seller Verification** - ID and face scan verification system
- **PWA Support** - Installable on mobile devices with offline capabilities

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Stripe account (for payments)
- Resend account (for email verification)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Ablorh4010/CampuStore.git
cd CampuStore
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# Stripe Configuration (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Vite Environment Variables (used by client)
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_publishable_key_here

# Session Secret (generate a random string)
SESSION_SECRET=your_random_session_secret_here

# Resend API Key for Email (get from https://resend.com)
RESEND_API_KEY=re_your_resend_api_key_here
```

### 4. Database Setup

Run database migrations to create all required tables:

```bash
npm run db:push
```

This will create the following tables:
- users
- stores
- categories
- products
- orders
- messages
- cart_items
- otp_codes

### 5. Seed Categories (Optional)

You may want to manually insert some categories into the database:

```sql
INSERT INTO categories (name, icon, color) VALUES
  ('Electronics', 'Laptop', '#3B82F6'),
  ('Books', 'Book', '#10B981'),
  ('Clothing', 'Shirt', '#F59E0B'),
  ('Furniture', 'Sofa', '#8B5CF6'),
  ('Sports', 'Dumbbell', '#EF4444'),
  ('Other', 'Package', '#6B7280');
```

## 🚀 Development

Start the development server:

```bash
npm run dev
```

This will start both the Vite dev server and the Express backend on port 5000.

Access the application at: `http://localhost:5000`

## 🏗️ Building for Production

### 1. Type Check

```bash
npm run check
```

### 2. Build the Application

```bash
npm run build
```

This will:
- Build the React frontend with Vite
- Bundle the Express backend with esbuild
- Output to the `dist` directory

### 3. Start Production Server

```bash
npm start
```

The application will be available on port 5000.

## 🔐 Admin Access

### Creating an Admin Account

Admin registration is restricted to secure invitation links only. To create an admin account:

1. Use the secure admin registration link:
   ```
   https://your-domain.com/admin-register?token=CSE_ADMIN_2025_SECURE_a9f4b7c2d8e1
   ```

2. Fill in the admin registration form with:
   - Email
   - Username
   - First Name
   - Last Name
   - Password

3. Once registered, admins can:
   - Review and approve/reject product listings
   - Import products via CSV
   - Manage all stores and products
   - Access admin dashboard

### Admin Login

After registration, admins can login at `/auth` using their email and password.

## 📱 Mobile Deployment

The app is configured with Capacitor for native iOS and Android deployment.

### Build for Mobile

See `MOBILE_DEPLOYMENT.md` for detailed mobile deployment instructions.

```bash
# Sync web app to mobile platforms
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode
npx cap open ios
```

## 🔧 Configuration

### Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from https://dashboard.stripe.com/test/apikeys
3. Add the keys to your `.env` file
4. For production, use live keys instead of test keys

### Email Setup (Resend)

1. Create a Resend account at https://resend.com
2. Get your API key
3. Add it to your `.env` file as `RESEND_API_KEY`

### Database Configuration

The app uses PostgreSQL with Drizzle ORM. Supported databases:
- Replit PostgreSQL
- Neon
- Supabase
- Any PostgreSQL-compatible database

Update `DATABASE_URL` in `.env` with your database connection string.

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/OTP or email/password
- `POST /api/auth/admin/register` - Register admin (requires token)

### Product Endpoints

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Store Endpoints

- `GET /api/stores` - Get all stores
- `GET /api/stores/:id` - Get store by ID
- `POST /api/stores` - Create new store
- `PUT /api/stores/:id` - Update store

### Cart Endpoints

- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:id` - Update cart item quantity
- `DELETE /api/cart/:id` - Remove item from cart

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection protection via Drizzle ORM
- XSS protection
- CORS configuration
- Secure session management

## 🧪 Testing

```bash
# Run TypeScript type checking
npm run check

# Run linters (if configured)
npm run lint
```

## 📦 Deployment

### Deployment Platforms

The app can be deployed to:
- Replit
- Vercel
- Railway
- Render
- Heroku
- DigitalOcean App Platform

### Environment Variables

Make sure to set all required environment variables in your deployment platform:
- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `SESSION_SECRET`
- `RESEND_API_KEY`

### Build Commands

- Install: `npm install`
- Build: `npm run build`
- Start: `npm start`

## 🐛 Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure database server is running
- Check firewall settings

### Stripe Payment Issues

- Verify API keys are correct
- Use test mode for development
- Check Stripe dashboard for errors

### Email Sending Issues

- Verify Resend API key
- Check domain verification
- Review Resend logs

## 📄 License

MIT

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Contact: support@campusstore.com

## 🙏 Acknowledgments

- React and Vite teams
- Stripe for payment processing
- Resend for email service
- Drizzle ORM for database management
- shadcn/ui for UI components
