# ... (builder stage remains the same)

# Final stage
# ... (actual builder stage above should be named 'builder')

# Final stage - RENAME THIS STAGE
FROM node:24-slim AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev

# --- This now correctly references the PREVIOUS stage named 'builder' ---
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
# If you have a public folder, you may also need:
# COPY --from=builder /app/public ./public 

# Create uploads folder
RUN mkdir -p uploads

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the application
CMD ["npm", "start"]
