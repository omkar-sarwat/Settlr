# Multi-stage Docker build for account-service
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY packages ./packages
COPY services/account-service ./services/account-service
RUN npm ci --workspace=account-service --include-workspace-root
RUN npm run build --workspace=account-service

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S settlr && adduser -S settlr -G settlr
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/account-service/dist ./dist
COPY --from=builder /app/services/account-service/package.json ./package.json

USER settlr
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/index.js"]
