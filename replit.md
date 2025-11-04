# CampusStore - StudentMarket

## Overview

CampusStore (with the subheading "StudentMarket") is a **Progressive Web App (PWA)** that serves as a mobile-installable marketplace connecting university students for buying and selling items. The platform works on Android and iPhone devices with a native app-like experience, featuring buyer/seller mode selection, OTP authentication, store creation, product listings, and student-to-student messaging. Built with React, Express.js, and in-memory storage (MemStorage) for fast performance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state, React Context for client state
- **Build Tool**: Vite for fast development and building
- **UI Components**: Radix UI primitives with custom styling
- **PWA**: Service Worker with cache-first strategy, manifest.json, offline capabilities
- **Mobile**: Installable on Android/iPhone, touch-optimized UI, mode selection for buyer/seller roles

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API architecture
- **Request Handling**: JSON parsing and URL encoding middleware
- **Error Handling**: Centralized error handling middleware
- **Development**: Hot reloading with Vite middleware integration

### Data Storage Solutions
- **Storage**: MemStorage (in-memory) for fast, lightweight data persistence
- **Database**: PostgreSQL available but currently using MemStorage for development
- **ORM**: Drizzle ORM configured for type-safe database operations
- **Schema**: Shared TypeScript schemas with Zod validation

## Progressive Web App (PWA) Features

### Mobile App Capabilities
- **Installable**: Add to home screen on Android and iPhone devices
- **Offline Mode**: Service worker caches assets for offline access
- **Native Experience**: Standalone display mode, no browser UI
- **App Icons**: 192x192 and 512x512 icons for different devices
- **Theme Integration**: Custom theme colors for Android/iOS status bars

### Mode Selection System
- **First Launch**: Mobile users see buyer vs seller mode selection
- **Buyer Mode**: Focus on shopping, browsing products, saving money
- **Seller Mode**: Focus on store creation, listing products, earning money
- **Persistence**: Mode choice saved in localStorage
- **Auth Flow**: Mode passed to authentication (e.g., /auth?mode=buyer)

### Service Worker Strategy
- **Cache-First**: Returns cached content immediately, updates in background
- **GET Only**: Only caches GET requests, skips POST/PUT/DELETE
- **Smart Caching**: Caches successful responses (status 200) automatically
- **Network Fallback**: Falls back to cache when offline
- **Auto-Activation**: skipWaiting() for immediate service worker updates

### Install Prompt
- **Smart Timing**: Appears for compatible browsers with beforeinstallprompt support
- **Dismissible**: Users can dismiss and it won't show again
- **User Choice**: Respects user's install/dismiss decision
- **iOS Support**: Apple mobile web app meta tags for iOS home screen

## Key Components

### Authentication System
- **Regular Users**: Phone OTP authentication only (no email/password)
- **Admin**: Email/password (richard.jil@outlook.com / Concierge2020) with password reset via email
- **OTP Security**: 5-minute expiration, one-time use enforcement, in-memory storage
- **Mode Selection**: First-time mobile users choose Buyer or Seller mode
- Context-based authentication state management
- Local storage persistence for user sessions and mode preference
- University-based user accounts

### Store Management
- Multi-store support per user
- Store creation and management
- University-based store categorization
- Rating and review system

### Product Catalog
- Category-based product organization
- Image gallery support
- Product conditions and pricing
- Search and filtering capabilities
- Featured products system

### Shopping Cart
- Persistent cart state
- Real-time cart updates
- Sidebar cart interface
- Quantity management

### Messaging System
- User-to-user communication
- Product-specific messaging
- Unread message tracking

### Order Management
- Order creation and tracking
- Buyer and seller order views
- Order status management

## Data Flow

1. **Client Requests**: React components make API calls through TanStack Query
2. **Service Worker**: Intercepts requests, serves from cache if available (cache-first)
3. **API Layer**: Express.js routes handle requests and validate data with Zod schemas
4. **Business Logic**: Route handlers process business logic and data transformations
5. **Data Access**: Storage interface abstracts operations using MemStorage (in-memory)
6. **Response**: JSON responses sent back to client with error handling

## Mobile User Journey

### First-Time Mobile User
1. User opens app on mobile device (Android/iPhone)
2. Automatically redirected to /mode-selection page
3. Chooses Buyer or Seller mode
4. Redirected to /auth with mode parameter (e.g., /auth?mode=buyer)
5. Enters phone number and receives OTP via SMS
6. Verifies OTP to complete registration/login
7. Mode preference saved in localStorage
8. App ready to use with role-specific features

### Returning User
1. User opens app (mode already set in localStorage)
2. If logged in: Goes to home page
3. If not logged in: Prompted to sign in with OTP
4. Service worker loads cached content for fast startup

### App Installation
1. PWA install prompt appears on compatible browsers
2. User taps "Install App" button
3. App icon added to home screen
4. Opens in standalone mode (no browser UI)
5. Works offline with cached content

## External Dependencies

### UI and Styling
- Radix UI for accessible component primitives
- Tailwind CSS for utility-first styling
- Lucide React for icons
- shadcn/ui for pre-built components

### Data Management
- TanStack Query for server state synchronization
- React Hook Form with Zod validation
- Date-fns for date manipulation

### Development Tools
- TypeScript for type safety
- ESBuild for production bundling
- Drizzle Kit for database schema management
- Replit-specific development plugins

## Deployment Strategy

### Build Process
- Frontend: Vite builds React app to `dist/public`
- Backend: ESBuild bundles Express server to `dist/index.js`
- Database: Drizzle migrations applied via `db:push` command

### Environment Configuration
- Development: Hot reloading with Vite middleware
- Production: Static file serving for built React app
- Database: Environment variable-based PostgreSQL connection

### Development Workflow
- `npm run dev`: Starts development server with hot reloading
- `npm run build`: Builds both client and server for production
- `npm run start`: Runs production server
- `npm run db:push`: Applies database schema changes

## Technical Implementation Notes

### PWA Configuration
- **Manifest**: `/client/public/manifest.json` defines app metadata
- **Service Worker**: `/client/public/sw.js` handles caching and offline mode
- **Icons**: App icons in `/client/public/` (icon-192.png, icon-512.png)
- **Meta Tags**: iOS and Android PWA tags in `index.html`

### Authentication Architecture
- **OTP Storage**: In-memory Map with phone → {code, expiresAt, used} mapping
- **OTP Lifecycle**: 5-minute expiration, deleted after successful verification
- **Admin Auth**: Separate email/password system for admin user
- **Password Reset**: Email verification via Resend integration

### Storage Design
- **Current**: MemStorage (in-memory) for fast development and testing
- **Future**: Can switch to PostgreSQL by updating storage implementation
- **Interface**: IStorage abstraction allows easy storage backend swapping

### Mode System
- **localStorage Keys**: 
  - `hasSeenModeSelection`: Tracks if user has seen mode selection
  - `userMode`: Stores chosen mode (buyer/seller)
- **URL Parameter**: `mode=buyer` or `mode=seller` in auth flow
- **Mobile Detection**: User agent string check for automatic redirect

The application is designed as a mobile-first PWA that works on Android and iPhone devices with offline capabilities and native app-like experience. It can be deployed on platforms like Replit with seamless integration between development and production environments.