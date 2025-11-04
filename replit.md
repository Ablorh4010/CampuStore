# CampusStore - StudentMarket

## Overview
CampusStore is a Progressive Web App (PWA) designed as a mobile-installable marketplace connecting university students for buying and selling items. It offers a native app-like experience on Android and iPhone, featuring buyer/seller mode selection, OTP authentication, store creation, product listings, student-to-student messaging, and a robust product upload system with image handling and special offers. The platform aims to provide a fast and efficient trading environment within university communities.

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
- **Authentication**: JWT-based for regular users (phone OTP) and admins (email/password). Includes secure token management, ownership verification, and admin-specific middleware.
- **Data Storage**: Currently uses MemStorage (in-memory) for development, with PostgreSQL and Drizzle ORM configured for future persistence.
- **File Uploads**: Dedicated endpoint for image uploads with validation and storage.

### Core Features
- **Authentication System**: Phone OTP for regular users, email/password for admin. Supports mode-based authentication.
- **Store Management**: Multi-store support per user, creation, and university-based categorization. Includes rating and review system.
- **Product Catalog**: Category-based organization, image gallery, product conditions, pricing, search, filtering, and featured products. Supports direct image uploads and special offers.
- **Shopping Cart**: Persistent state, real-time updates, sidebar interface, quantity management.
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

### Development Tools
- **TypeScript**: Type safety.
- **ESBuild**: Production bundling.
- **Drizzle Kit**: Database schema management.
- **Capacitor 7**: Native iOS and Android app wrapper.