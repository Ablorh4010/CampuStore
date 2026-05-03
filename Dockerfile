FROM node:24-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the application
RUN npm run build

# Final stage
FROM node:24-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev

# Copy the build artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Create uploads folder
RUN mkdir -p uploads

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the application
CMD ["npm", "start"]
