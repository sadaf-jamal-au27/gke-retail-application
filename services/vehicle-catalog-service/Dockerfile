# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/service-core ./packages/service-core
COPY packages/automobile-db ./packages/automobile-db
COPY services/vehicle-catalog-service ./services/vehicle-catalog-service
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @retail/automobile-db build
RUN pnpm --filter @retail/vehicle-catalog-service build

FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/vehicle-catalog-service/dist ./dist
COPY --from=build /app/services/vehicle-catalog-service/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/service-core ./node_modules/@retail/service-core
COPY --from=build /app/packages/automobile-db/dist ./node_modules/@retail/automobile-db/dist
COPY --from=build /app/packages/automobile-db/package.json ./node_modules/@retail/automobile-db/package.json
USER nonroot
EXPOSE 8080
CMD ["dist/index.js"]
