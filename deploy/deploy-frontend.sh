#!/usr/bin/env bash
# Build the frontend and install it where host nginx serves it from
# (see deploy/nginx/app.conf.example: root /var/www/cv-analyzer/dist).
# Run on the VPS after `git pull`, alongside `docker compose up -d --build backend`.
set -e

TARGET_DIR="/var/www/cv-analyzer/dist"

echo "### Building frontend ..."
docker build --target build -t cv-frontend-build ./frontend

id=$(docker create cv-frontend-build)
trap 'docker rm -f "$id" >/dev/null 2>&1; docker rmi cv-frontend-build >/dev/null 2>&1' EXIT

echo "### Installing to $TARGET_DIR ..."
sudo mkdir -p "$TARGET_DIR"
sudo rm -rf "${TARGET_DIR:?}"/*
docker cp "$id":/app/dist/. "$TARGET_DIR"

echo "### Done. No nginx reload needed (static files, no config change)."
