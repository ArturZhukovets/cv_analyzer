FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# No runtime stage: this image only ever produces /app/dist.
# deploy/deploy-frontend.sh extracts it and installs it for host nginx to
# serve directly — see deploy.md.
