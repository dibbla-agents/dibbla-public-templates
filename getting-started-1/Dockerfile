# ---- Stage 1: Build Frontend ----
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Build Go Binary ----
FROM golang:1.23-alpine AS go-builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
COPY --from=frontend-builder /app/dist ./dist/
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server main.go

# ---- Stage 3: Final Minimal Image ----
FROM alpine:3.20

RUN apk --no-cache add ca-certificates
COPY --from=go-builder /server /server

EXPOSE 80
ENTRYPOINT ["/server"]
