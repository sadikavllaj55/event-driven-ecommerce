FROM node:22-alpine

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Run the TypeScript directly (Node's built-in TS support)
CMD ["node", "src/index.ts"]
