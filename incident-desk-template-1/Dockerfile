# ---- Stage 1: Build Frontend ----
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Build Go Binary ----
FROM golang:1.24-alpine AS go-builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
COPY --from=frontend-builder /app/dist ./dist/
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server .

# ---- Stage 3: Final Minimal Image ----
FROM alpine:3.20

RUN apk --no-cache add ca-certificates
COPY --from=go-builder /server /server
# Ship the pre-deploy review report and the user handbook into the image. These
# are markdown, so the .dockerignore deliberately does NOT exclude *.md — a
# stale `*.md` rule would silently strip them and the handbook would not render.
COPY REVIEW.md /REVIEW.md
COPY docs/ /docs/

EXPOSE 80
ENTRYPOINT ["/server"]
