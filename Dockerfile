FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY prisma/ ./prisma/
RUN npm ci --production && npx prisma generate

# Copy application
COPY src/ ./src/

EXPOSE 3000

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
