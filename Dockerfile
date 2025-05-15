# 1. Backend 빌드
FROM golang:1.24.3-alpine AS backend-builder

WORKDIR /app

COPY . .
RUN go mod tidy
RUN go build -o simple-k8s-insights ./cmd/server/main.go

# 2. Frontend 빌드
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/ .
RUN npm install
RUN npm run build

# 3. 실행 이미지
FROM debian:bullseye-slim

WORKDIR /root/

COPY --from=backend-builder /app/simple-k8s-insights .
COPY --from=frontend-builder /frontend/dist ./frontend/dist
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

CMD ["./simple-k8s-insights"]
