FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install || true

COPY . .
RUN npm run build || true

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html || COPY ./public /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

