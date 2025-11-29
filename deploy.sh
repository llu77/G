#!/bin/bash

# LMM Finance Advanced System Deployment Script
# This script deploys the application to Cloudflare Pages

set -e

echo "🚀 Starting deployment process..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ to continue."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js 18+ or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm to continue."
    exit 1
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Clean previous build
print_status "Cleaning previous build..."
rm -rf dist

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build the application
print_status "Building the application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed. 'dist' directory not found."
    exit 1
fi

# Deploy to Cloudflare Pages
print_status "Deploying to Cloudflare Pages..."

# Check if Cloudflare API token is set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    print_warning "CLOUDFLARE_API_TOKEN environment variable not set."
    echo "Please set your Cloudflare API token:"
    echo "export CLOUDFLARE_API_TOKEN=your_token_here"
    echo ""
    echo "Or login with Wrangler:"
    echo "wrangler login"
    
    # Try to login
    wrangler login
fi

# Deploy the application
print_status "Uploading files to Cloudflare Pages..."
wrangler pages deploy dist --project-name=lmm-finance-advanced-system

print_success "Deployment completed successfully! 🎉"
print_success "Your application is now live on Cloudflare Pages"

# Display deployment information
echo ""
echo "📋 Deployment Information:"
echo "======================="
echo "Project: LMM Finance Advanced System"
echo "Framework: React 19 + Vite 6"
echo "UI Design: Glass Morphism"
echo "Features: Modern Authentication, Dashboard Analytics"
echo ""
echo "🔗 Features Implemented:"
echo "  ✓ React 19 with latest features"
echo "  ✓ Glass Morphism UI Design"
echo "  ✓ Advanced Authentication"
echo "  ✓ Interactive Dashboard"
echo "  ✓ Real-time Analytics"
echo "  ✓ Responsive Design"
echo "  ✓ Arabic RTL Support"
echo "  ✓ Modern Animations"
echo ""
echo "🌐 Your application is ready!"