#!/usr/bin/env bash
set -e

if [ ! -f .env ]; then
    echo "No .env found. Copy .env.example to .env and set OPENAI_API_KEY first."
    exit 1
fi

docker compose build
docker compose up -d
