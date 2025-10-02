#!/bin/bash

# Production Setup Script for Online Entrance Exams Backend
# Run this script after deploying to Render to initialize the database

echo "🚀 Setting up production database..."

# Check if required environment variables are set
if [ -z "$DB_HOST" ]; then
    echo "❌ Error: DB_HOST environment variable is not set"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ Error: JWT_SECRET environment variable is not set"
    exit 1
fi

echo "✅ Environment variables check passed"

# Run database migrations
echo "📊 Running database migrations..."
npm run migration:run

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migrations failed"
    exit 1
fi

# Seed the database with admin user
echo "👤 Seeding database with admin user..."
npm run seed

if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully"
    echo ""
    echo "🎉 Production setup completed!"
    echo ""
    echo "Admin credentials:"
    echo "Email: admin@example.com"
    echo "Password: admin123"
    echo ""
    echo "⚠️  Please change the admin password after first login!"
else
    echo "❌ Database seeding failed"
    exit 1
fi
