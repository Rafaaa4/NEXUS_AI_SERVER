FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY dashboard ./dashboard

RUN npm install
RUN npm run build --workspace=@nexus/shared-types

WORKDIR /app/dashboard
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dashboard/dist /usr/share/nginx/html
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
