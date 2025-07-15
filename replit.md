# CampusStore - StudentMarket

## Overview

CampusStore (with the subheading "StudentMarket") is a full-stack web application that serves as a marketplace connecting university students for buying and selling items. The platform allows students to create stores, list products, browse by categories, and communicate with each other. It's built with a modern tech stack featuring React, Express.js, PostgreSQL, and Drizzle ORM.

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

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API architecture
- **Request Handling**: JSON parsing and URL encoding middleware
- **Error Handling**: Centralized error handling middleware
- **Development**: Hot reloading with Vite middleware integration

### Data Storage Solutions
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: @neondatabase/serverless for serverless PostgreSQL connection

## Key Components

### Authentication System
- User registration and login functionality
- Context-based authentication state management
- Local storage persistence for user sessions
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
2. **API Layer**: Express.js routes handle requests and validate data with Zod schemas
3. **Business Logic**: Route handlers process business logic and data transformations
4. **Data Access**: Storage interface abstracts database operations using Drizzle ORM
5. **Database**: PostgreSQL stores all application data with type-safe queries
6. **Response**: JSON responses sent back to client with error handling

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

The application is designed to be deployed on platforms like Replit with seamless integration between development and production environments.