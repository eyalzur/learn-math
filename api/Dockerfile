# The bundle (api/dist/index.mjs) is built by the workflow before this runs: `npm run api:build`.
# Only firebase-admin stays outside it, so only it is installed here.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/index.mjs"]
