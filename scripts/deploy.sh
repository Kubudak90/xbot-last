#!/bin/bash

# XBot Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "XBot Deployment - $ENVIRONMENT"
echo "=========================================="

cd "$PROJECT_DIR"

# Check if .env file exists
if [ ! -f ".env.local" ] && [ "$ENVIRONMENT" != "docker" ]; then
    echo "Error: .env.local file not found!"
    echo "Please copy .env.example to .env.local and configure it."
    exit 1
fi

case $ENVIRONMENT in
    "development")
        echo "Starting development server..."
        npm run dev
        ;;

    "production")
        echo "Building for production..."
        npm run build

        echo "Running database migrations..."
        npx prisma db push

        echo "Starting production server..."
        npm run start
        ;;

    "docker")
        echo "Building Docker image..."
        docker-compose build

        echo "Starting containers..."
        docker-compose up -d

        echo "Waiting for containers to be healthy..."
        sleep 10

        echo "Checking health..."
        curl -s http://localhost:3000/api/health || echo "Health check failed"
        ;;

    "docker-build")
        echo "Building Docker image only..."
        docker build -t xbot:latest .
        ;;

    "docker-push")
        if [ -z "$DOCKER_REGISTRY" ]; then
            echo "Error: DOCKER_REGISTRY not set"
            exit 1
        fi
        echo "Pushing to registry: $DOCKER_REGISTRY"
        docker tag xbot:latest $DOCKER_REGISTRY/xbot:latest
        docker push $DOCKER_REGISTRY/xbot:latest
        ;;

    "test")
        echo "Running tests..."
        npm run test
        ;;

    "lint")
        echo "Running linter..."
        npm run lint
        ;;

    *)
        echo "Unknown environment: $ENVIRONMENT"
        echo "Usage: ./scripts/deploy.sh [development|production|docker|docker-build|docker-push|test|lint]"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="
