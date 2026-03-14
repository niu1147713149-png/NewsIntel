FROM node:20-alpine

WORKDIR /app

COPY package.json /app/package.json
RUN corepack enable && pnpm install --no-frozen-lockfile

COPY . /app

EXPOSE 3000

CMD ["pnpm", "dev"]
