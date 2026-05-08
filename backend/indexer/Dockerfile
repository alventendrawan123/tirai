FROM node:22-alpine

WORKDIR /app

# Install deps first for better caching
COPY package.json ./
RUN npm install --omit=dev tsx typescript

COPY tsconfig.json ./
COPY src/ ./src/

# Health check (optional — Railway monitors via process exit code)
ENV NODE_ENV=production

CMD ["npx", "tsx", "src/index.ts"]
