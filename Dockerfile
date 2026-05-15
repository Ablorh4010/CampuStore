# Stage 1: Build the application
FROM node:24-slim AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Next.js application (generates .next and/or dist)
RUN npm run build

# Stage 2: Production runner
FROM node:24-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# --- THE FIX: Correctly reference the 'builder' stage ---
# Copy the production build artifacts from the builder stage
COPY --from=builder /app/.next ./.next

# If your project uses a 'dist' folder or 'public' folder, uncomment these:
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/public ./public 

# Create necessary folders for the application
RUN mkdir -p uploads

# Expose the port Cloud Run expects
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
