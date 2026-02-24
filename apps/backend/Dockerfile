FROM node:20-alpine AS builder
WORKDIR /app

# Unset NODE_ENV so devDependencies (typescript) get installed
ENV NODE_ENV=development

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

RUN npm install --legacy-peer-deps

COPY apps/backend ./apps/backend

# Compile TypeScript
RUN cd apps/backend && ../../node_modules/.bin/tsc

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY apps/backend/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/apps/backend/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
