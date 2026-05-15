# ... (builder stage remains the same)

# Final stage
FROM node:24-slim As builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev

# --- THE FIX: Copy BOTH .next and dist folders ---
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
# ------------------------------------------------

# Create uploads folder
RUN mkdir -p uploads

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the application
CMD ["npm", "start"]
