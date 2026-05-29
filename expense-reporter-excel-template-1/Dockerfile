# ---- Stage 1: Build Frontend ----
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Build .NET Backend ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dotnet-builder

WORKDIR /app
COPY ExpenseReporter.csproj ./
RUN dotnet restore
COPY *.cs ./
COPY appsettings.json ./
RUN dotnet publish -c Release -o /publish

# ---- Stage 3: Final Runtime Image ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0

WORKDIR /app
COPY --from=dotnet-builder /publish ./
# Place the built frontend next to the DLL so it's served as static files.
COPY --from=frontend-builder /app/dist ./dist/

EXPOSE 80
ENV PORT=80
ENTRYPOINT ["dotnet", "ExpenseReporter.dll"]
