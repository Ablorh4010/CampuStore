# The University Hub - the student market place

A Progressive Web App (PWA) designed as a mobile-installable marketplace connecting university students for buying and selling items. Built with React, TypeScript, Express, and PostgreSQL.

## 🚀 Features

### Core Marketplace
- **Email Verification Authentication** - Secure OTP-based login system
- **Admin Dashboard** - Product approval and management system
- **Store Management** - Multi-store support per user
- **Product Catalog** - Category-based organization with search and filtering
- **Shopping Cart** - Persistent cart with real-time updates
- **Payment Processing** - Paystack integration (Card, Mobile Money)
- **Messaging System** - User-to-user and product-specific communication
- **Seller Verification** - ID and face scan verification system
- **PWA Support** - Installable on mobile devices with offline capabilities

### Interactive Features (New!)
- **Live Chat Support** - Real-time WebSocket chat using Socket.IO for instant communication
- **Push Notifications** - Web push notifications for order updates, messages, and promotions
- **Event Calendar** - Club and organization event management with RSVP functionality
- **Social Profiles** - Follow users, view connections, and leave seller reviews
- **Club/Organization Pages** - Create and manage clubs with events and announcements
- **Bidding/Auction System** - List items for auction with real-time bidding
- **Study Group Finder** - Find and join study groups by course
- **Gamification** - Badges, points, leaderboards, and rewards system

## 📋 Prerequisites

- Node.js 24+ and npm
- PostgreSQL database
- Paystack account (for payments)
- Resend account (for email verification)
- Optional: VAPID keys for push notifications

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Ablorh4010/TheUniversityHub.git
cd TheUniversityHub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory (see `.env.example`):

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# Paystack Configuration (get from https://dashboard.paystack.com/#/settings/developer)
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here

# Push Notifications (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_EMAIL=support@theuniversityhub.com

# WhatsApp OTP (optional)
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
META_WHATSAPP_ACCESS_TOKEN=your_access_token_here

# Session Secret
SESSION_SECRET=your_random_session_secret_here

# Resend API Key for Email
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
- events, event_rsvps (Calendar)
- clubs, club_memberships (Organizations)
- auctions, auction_bids (Bidding)
- study_groups, study_group_memberships (Study Groups)
- user_follows, seller_reviews (Social)
- badges, user_badges, user_points, points_history (Gamification)

### 5. Seed Categories (Optional)

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
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/OTP or email/password
- `POST /api/auth/admin/register` - Register admin (requires token)
- `POST /api/auth/send-whatsapp-otp` - Send WhatsApp OTP (sellers)
- `POST /api/auth/seller/register` - Register seller

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

- `GET /api/cart/:userId` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:id` - Update cart item quantity
- `DELETE /api/cart/:id` - Remove item from cart

### Event Calendar Endpoints (New!)

- `GET /api/events` - Get all events (with filters)
- `GET /api/events/:id` - Get event details with RSVP counts
- `POST /api/events` - Create new event
- `POST /api/events/:id/rsvp` - RSVP to event

### Club/Organization Endpoints (New!)

- `GET /api/clubs` - Get all clubs
- `GET /api/clubs/:id` - Get club with upcoming events
- `POST /api/clubs` - Create new club
- `POST /api/clubs/:id/join` - Join a club

### Auction/Bidding Endpoints (New!)

- `GET /api/auctions` - Get active auctions
- `GET /api/auctions/:id` - Get auction with bid history
- `POST /api/auctions` - Create new auction
- `POST /api/auctions/:id/bid` - Place a bid

### Study Group Endpoints (New!)

- `GET /api/study-groups` - Get study groups (by course/university)
- `POST /api/study-groups` - Create study group
- `POST /api/study-groups/:id/join` - Request to join

### Social Endpoints (New!)

- `POST /api/users/:id/follow` - Follow a user
- `DELETE /api/users/:id/follow` - Unfollow a user
- `GET /api/users/:id/followers` - Get user's followers
- `GET /api/users/:id/following` - Get user's following
- `GET /api/sellers/:id/reviews` - Get seller reviews
- `POST /api/sellers/:id/reviews` - Add seller review

### Gamification Endpoints (New!)

- `GET /api/badges` - Get all available badges
- `GET /api/users/:id/badges` - Get user's earned badges
- `GET /api/users/:id/points` - Get user's points and level
- `GET /api/users/:id/points/history` - Get points transaction history
- `GET /api/leaderboard` - Get top users leaderboard

### Push Notification Endpoints (New!)

- `GET /api/push/vapid-key` - Get VAPID public key
- `POST /api/push/subscribe` - Subscribe to push notifications
- `POST /api/push/unsubscribe` - Unsubscribe from notifications
- `POST /api/push/test` - Send test notification

## 🔒 Security

- JWT-based authentication with secure token management
- Password hashing with bcrypt
- SQL injection protection via Drizzle ORM
- Rate limiting on sensitive endpoints
- XSS protection
- CORS configuration
- Secure session management
- Socket.IO authentication middleware

## 🌐 Google Cloud Hosting

This project is hosted on **Google Cloud Run** using Project ID: **chromatic-force-480509-j5**.

### Deployment to Cloud Run
1. Ensure your `gcloud` CLI is configured.
2. Run `npm run deploy` to build and deploy the latest version.
3. The application will be automatically containerized and deployed to `europe-west1`.

### Database (Neon)
The application uses **Neon PostgreSQL**. Connection details are managed via the `DATABASE_URL` environment variable.

### Required Environment Variables
All variables from `.env.example` must be configured in your hosting environment (Cloud Run environment variables).

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
- Contact: support@theuniversityhub.com

## 🙏 Acknowledgments

- React and Vite teams
- Stripe for payment processing
- Resend for email service
- Drizzle ORM for database management
- shadcn/ui for UI components

- # 🏪 CampuStore

A comprehensive platform for students to find hostels, internships, and engage with the campus community.

## ✨ Features

- 🏠 **Hostel Listings & Reviews** - Browse and review student accommodations
- 💼 **Internship Opportunities** - Discover job and internship positions from companies
- 📧 **AI-Powered Email Applications** - Generate professional application emails using OpenAI
- 👥 **Student Profiles** - LinkedIn-style professional profiles for students
- 💬 **Community Posts** - Create posts, comments, and engage with other students
- 🔍 **Smart Search & Filters** - Find hostels and opportunities based on your criteria
- ⭐ **Ratings & Reviews** - Rate and review hostels and opportunities
- 🔐 **Secure Authentication** - JWT-based user authentication
- 📊 **Admin Dashboard** - Monitor emails, users, and platform activity

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework
- **React 18** - UI library
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database (Neon)
- **OpenAI** - AI email generation
- **Resend** - Email delivery
- **Puppeteer** - Web scraping
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Database
- **PostgreSQL (Neon)** - Cloud database

### External APIs
- **OpenAI GPT-4** - AI email generation
- **Resend** - Email sending service
- **Puppeteer** - Job board scraping

## 📋 Prerequisites

Before you begin, you need:

- **Node.js** v14 or higher
- **npm** or **yarn**
- **PostgreSQL** account (Neon recommended - free tier available)
- **OpenAI API Key** (from https://platform.openai.com)
- **Resend API Key** (from https://resend.com)
- **Git**

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Ablorh4010/CampuStore.git
cd CampuStore
