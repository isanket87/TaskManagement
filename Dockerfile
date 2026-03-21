# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: Final Production Image ---
FROM node:20-alpine
WORKDIR /app

# Install PM2 globally
RUN npm install pm2 -g

# Copy server files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev

# Copy rest of the server code
COPY server/ ./
# Generate Prisma Client
RUN npx prisma generate

# Copy built frontend assets from Stage 1 to server's public folder
COPY --from=client-build /app/client/dist /app/server/public

# Copy ecosystem config from root
COPY ecosystem.config.cjs /app/

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start application using PM2 in the foreground
CMD ["pm2-runtime", "start", "/app/ecosystem.config.cjs", "--env", "production"]
