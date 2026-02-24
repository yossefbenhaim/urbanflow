FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

RUN npm install --legacy-peer-deps

COPY apps/backend ./apps/backend

RUN cd apps/backend && ../../node_modules/.bin/tsc

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/index.js"]
