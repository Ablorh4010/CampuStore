FROM node:24-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the application
# This runs 'vite build' and 'esbuild' as defined in package.json
RUN npm run build

# Final stage
FROM node:24-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install --include=dev

# Copy the build artifacts from the builder stage
COPY --from=builder /app/dist ./dist
# Copy uploads folder if it exists, or create it
RUN mkdir -p uploads

# The server expects to serve from dist/public
# The esbuild output is dist/index.js

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

# Start the application
CMD ["npm", "start"]
