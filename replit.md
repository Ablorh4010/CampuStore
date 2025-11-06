# Campus Exchange

## Overview
Campus Exchange is a Progressive Web App (PWA) designed as a mobile-installable marketplace connecting university students for buying and selling items. It offers a native app-like experience on Android and iPhone, featuring buyer/seller mode selection, email verification authentication, store creation, product listings, student-to-student messaging, and a robust product upload system with image handling and special offers. The platform aims to provide a fast and efficient trading environment within university communities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state, React Context for client state
- **Build Tool**: Vite
- **UI Components**: Radix UI primitives
- **PWA Features**: Service Worker with cache-first strategy, manifest.json, offline capabilities, installable on mobile devices, touch-optimized UI.
- **Mode Selection**: Users choose between Buyer and Seller modes on first launch, stored in localStorage.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API
- **Error Handling**: Centralized middleware
- **Authentication**: JWT-based for regular users (email verification) and admins (email/password). Includes secure token management, ownership verification, and admin-specific middleware. Resend integration for email delivery.
- **Data Storage**: Replit PostgreSQL database with Drizzle ORM using node-postgres driver. Full persistence enabled.
- **File Uploads**: Dedicated endpoint for image uploads with validation and storage.

### Core Features
- **Authentication System**: Email verification with 6-digit codes for regular users, email/password for admin. Admin registration restricted to secure invitation links only.
- **Store Management**: Multi-store support per user, creation, and university-based categorization. Includes rating and review system.
- **Product Catalog**: Category-based organization, image gallery, product conditions, pricing, search, filtering, and featured products. Supports direct image uploads and special offers.
- **Shopping Cart**: Persistent state, real-time updates, sidebar interface, quantity management.
- **Payment Processing**: Stripe integration supporting Card, PayPal, and Mobile Money payments in a unified checkout flow.
- **Messaging System**: User-to-user and product-specific communication with unread tracking.
- **Order Management**: Creation, tracking, buyer/seller views, and status management.
- **Seller Verification**: Identity verification process including ID photo and live selfie/face scan, with admin review and payment details management (Bank, PayPal, Mobile Money).
- **Admin Features**: Product import via CSV or URL (Shopify, WooCommerce).

### PWA and Mobile Capabilities
- **Installable**: Add to home screen on Android and iPhone.
- **Offline Mode**: Service worker caches assets for offline access.
- **Native Experience**: Standalone display mode.
- **Service Worker Strategy**: Cache-first for GET requests, network fallback.
- **Install Prompt**: Smart timing for compatible browsers.
- **Capacitor Setup**: Configured for native iOS and Android app deployment (com.campusstore.app).

## External Dependencies

### UI and Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling.
- **Lucide React**: Icons.
- **shadcn/ui**: Pre-built components.

### Data Management
- **TanStack Query**: Server state synchronization.
- **React Hook Form**: Form management with Zod validation.
- **Date-fns**: Date manipulation.

### Payment Processing
- **Stripe**: Complete payment integration for Card, PayPal, and Mobile Money.

### Email Service
- **Resend**: Transactional email service for sending verification codes to users.

### Development Tools
- **TypeScript**: Type safety.
- **ESBuild**: Production bundling.
- **Drizzle Kit**: Database schema management.
- **Capacitor 7**: Native iOS and Android app wrapper.

## Recent Changes

### Email Verification & Secure Admin Access (November 6, 2025)
- **Switched from Phone to Email Verification**: Regular users now authenticate using email verification instead of SMS OTP
  - Cost optimization: Email verification via Resend is more affordable than SMS
  - Database schema updated: otp_codes table now uses email field, phone_number column removed
  - Frontend completely rewritten: auth page now uses email input instead of phone number
  - Backend updated: /api/auth/send-otp sends verification emails via Resend
  - Auth context updated: sendOtp now accepts email parameter
- **Secure Admin Registration**: Admin access restricted to invitation-only system
  - Admin registration route protected by secure token (CSE_ADMIN_2025_SECURE_a9f4b7c2d8e1)
  - Dedicated admin registration page at /admin-register?token=...
  - Admin tab completely removed from public auth page
  - Token validation on backend before allowing admin account creation
  - Pre-filled email field for invited admin (richard.jil@outlook.com)
  - Admin invite link: https://uniexchangehub.com/admin-register?token=CSE_ADMIN_2025_SECURE_a9f4b7c2d8e1
- **Navigation Menu Enhancement**: Added About and Contact pages
  - About page at /about with mission, values, and platform features
  - Contact page at /contact with contact form and FAQ section
  - Both pages accessible from category navigation menu with icon buttons
  - Separator added between product categories and static navigation links
- **Testing**: End-to-end tests passed successfully
  - Email verification flow working correctly
  - OTP generation and validation functional
  - About and Contact pages rendering properly
  - Admin registration token protection verified
- **Status**: ✅ Fully operational, production-ready

### Admin Signup System (November 5, 2025) [DEPRECATED - See Email Verification section above]
- **Removed Hardcoded Admin Credentials**: Deleted existing admin user from database
- **Admin Registration Route**: Added POST /api/auth/admin/register endpoint
  - Accepts email, password, username, firstName, lastName
  - Automatically sets isAdmin: true for admin accounts
  - Includes validation for duplicate emails/usernames
  - Returns JWT token on successful registration
- **Frontend Admin Signup**: Updated admin auth page with tabbed interface
  - Two tabs: Sign In and Sign Up
  - Default tab set to "Sign Up" for easy first-time admin registration
  - Complete signup form with email, username, first/last name, password fields
  - Password visibility toggle for both login and signup
  - Integrated with auth context via new registerAdmin function
- **Auth Context Enhancement**: Added registerAdmin mutation and function
- **Status**: ✅ Fully operational, admins can now self-register

### Database Migration to Replit PostgreSQL (November 4, 2025)
- **Fresh Database Setup**: Migrated from deleted Neon database to new Replit PostgreSQL
- **Driver Update**: Switched from `@neondatabase/serverless` to standard `node-postgres` (pg) driver
- **Schema Initialization**: All 8 tables successfully created (users, stores, products, categories, cart_items, orders, messages, otp_codes)
- **Storage Layer**: Switched from MemStorage to DatabaseStorage for full data persistence
- **Database Configuration**: Using `drizzle-orm/node-postgres` with pg Pool for connection management
- **Status**: ✅ Fully operational, all API endpoints working correctly with PostgreSQL

### Stripe Payment Integration (November 2025)
- **Unified Payment Processing**: Integrated Stripe for Card, PayPal, and Mobile Money payments
  - All payment methods go into a single Stripe account for easy admin management
  - Automatic payment method detection based on user's region
  - Support for 3D Secure, SCA compliance, and redirect-based payments
- **Checkout Flow**:
  - Dedicated checkout page at /checkout with order summary
  - Stripe PaymentElement with automatic payment method selection
  - JWT authentication required for checkout
  - Cart validation before payment processing
  - Real-time payment status verification
- **Payment Success Handling**:
  - Dedicated /payment-success page for redirect-based payments
  - Automatic PaymentIntent status verification
  - Cart clearing on successful payment
  - Error recovery flow for failed payments
- **Backend Implementation**:
  - POST /api/create-payment-intent - Creates Stripe PaymentIntent
  - JWT authentication required for all payment endpoints
  - Cart items and amount stored in Stripe metadata
  - Server-side amount validation
- **Security Features**:
  - Stripe SDK with latest API version
  - Automatic payment methods enabled
  - PCI DSS compliant (Stripe handles card data)
  - Secure payment intent creation with metadata
- **User Experience**:
  - Loading states and error handling throughout
  - Security badges and trust indicators
  - Responsive design with mobile optimization
  - Clear payment status messaging
- **Admin Dashboard**: All transactions viewable and manageable from Stripe Dashboard
- **Testing Status**: LSP clean, production-ready, supports test mode with pk_test/sk_test keys

### Logo Integration (November 2025)
- **CampusStore Logo**: Added generated logo to header and browser tab
- **Favicon**: Set app icon for browser tab and mobile bookmarks
- **Apple Touch Icon**: Configured for iOS home screen installation
- **Branding**: Logo appears in header with hover animations and transitions

### Seller Payment Details and Verification (November 2025)
- **Payment Details Management**: Sellers can now configure payment methods
  - Three payment options: Bank Account, PayPal, Mobile Money
  - Bank: Account holder name, bank name, account number
  - PayPal: Email or user ID
  - Mobile Money: Provider name and phone number
- **Seller Verification System**: Identity verification with ID and face scan
  - Upload government-issued ID photo
  - Live selfie/face scan for identity verification
  - Verification statuses: unverified, pending, verified, rejected
  - Admin review required before seller can receive payments
- **Name Matching Requirements**: Prominent warnings that payment account name must match ID
- **API Endpoints**:
  - POST /api/upload/verification - Upload ID and face scan images
  - PUT /api/users/payment-details - Update seller payment information
- **Seller Settings Page**: Dedicated page at /seller-settings
  - Payment details form with conditional fields per payment method
  - Verification upload form with image previews
  - Verification status badges and clear instructions
  - Mobile camera capture support for face scan
- **Schema Updates**: Added payment and verification fields to users table
- **Security**: JWT-authenticated endpoints, admin-controlled verification status
- **Testing Status**: Architect-verified, LSP clean, production-ready