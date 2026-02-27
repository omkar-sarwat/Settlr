# Multi-stage Docker build for admin-service
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY packages ./packages
COPY services/admin-service ./services/admin-service
RUN npm ci --workspace=admin-service --include-workspace-root
RUN npm run build --workspace=admin-service

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S settlr && adduser -S settlr -G settlr
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/admin-service/dist ./dist
COPY --from=builder /app/services/admin-service/package.json ./package.json

USER settlr
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3003/health || exit 1
CMD ["node", "dist/index.js"]
