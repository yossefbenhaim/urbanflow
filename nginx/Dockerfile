FROM node:20-alpine AS builder
WORKDIR /app

# Unset NODE_ENV so devDependencies get installed for build
ENV NODE_ENV=development

COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/backend/package*.json ./apps/backend/

RUN npm install --legacy-peer-deps

COPY apps/ ./apps/

RUN npm run build -w apps/frontend

FROM nginx:alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
