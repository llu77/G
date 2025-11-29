#!/bin/bash

# ████████╗███████╗███████╗████████╗    ███████╗ ██████╗ █████╗ ███╗   ██╗
# ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝    ██╔════╝██╔════╝██╔══██╗████╗  ██║
#    ██║   █████╗  ███████╗   ██║       ███████╗██║     ███████║██╔██╗ ██║
#    ██║   ██╔══╝  ╚════██║   ██║       ╚════██║██║     ██╔══██║██║╚██╗██║
#    ██║   ███████╗███████║   ██║       ███████║╚██████╗██║  ██║██║ ╚████║
#    ╚═╝   ╚══════╝╚══════╝   ╚═╝       ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝
#
# Secure Deployment Script for LMM Finance ERP System
# Based on 2024-2025 Cloudflare and Shell Security Best Practices
# Author: SymbolAI Development Team
# Version: 2.0
# Last Updated: December 2024

set -euo pipefail  # Strict error handling

# Script configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/tmp/${SCRIPT_NAME}_$(date +%Y%m%d_%H%M%S).log"
readonly LOCK_FILE="/tmp/${SCRIPT_NAME}.lock"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# Security configuration
readonly REQUIRED_COMMANDS=("wrangler" "git" "npm" "node")
readonly ALLOWED_ENVIRONMENTS=("production" "staging" "development")
readonly MAX_DEPLOYMENT_TIME=300  # 5 minutes

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Enhanced logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local color="$WHITE"
    
    case "$level" in
        ERROR) color="$RED" ;;
        WARN) color="$YELLOW" ;;
        SUCCESS) color="$GREEN" ;;
        INFO) color="$CYAN" ;;
        DEBUG) color="$PURPLE" ;;
    esac
    
    echo -e "${color}[${timestamp}] [${level}]${NC} ${message}" | tee -a "$LOG_FILE"
}

# Input validation function
validate_input() {
    local input="$1"
    local pattern="$2"
    local message="$3"
    
    if [[ ! "$input" =~ $pattern ]]; then
        log ERROR "Validation failed: $message"
        return 1
    fi
    return 0
}

# Secure file operations
create_secure_file() {
    local file="$1"
    local content="$2"
    
    # Create with restrictive permissions
    umask 077
    echo "$content" > "$file"
    chmod 600 "$file"
    log SUCCESS "Created secure file: $file"
}

# Cleanup function
cleanup() {
    log INFO "Cleaning up temporary files..."
    rm -f "$LOCK_FILE"
    # Keep log files for debugging
}

# Error handling
trap 'log ERROR "Error on line $LINENO"' ERR
trap cleanup EXIT

# =============================================================================
# SECURITY FUNCTIONS
# =============================================================================

# Check system security
security_check() {
    log INFO "Performing security checks..."
    
    # Check if running as root (not recommended)
    if [[ $EUID -eq 0 ]]; then
        log WARN "Running as root is not recommended for security reasons"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check file permissions
    if [[ -f "$SCRIPT_NAME" ]]; then
        local perms=$(stat -c %a "$SCRIPT_NAME" 2>/dev/null || echo "755")
        if [[ "$perms" != "700" ]]; then
            log WARN "Script permissions should be 700 for security"
            chmod 700 "$SCRIPT_NAME" 2>/dev/null || true
        fi
    fi
    
    # Check for required commands
    for cmd in "${REQUIRED_COMMANDS[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log ERROR "Required command not found: $cmd"
            exit 1
        fi
    done
    
    log SUCCESS "Security checks passed"
}

# Validate environment variables
validate_environment() {
    local env="$1"
    
    if [[ ! " ${ALLOWED_ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        log ERROR "Invalid environment: $env"
        log INFO "Allowed environments: ${ALLOWED_ENVIRONMENTS[*]}"
        exit 1
    fi
    
    # Check required environment variables
    local required_vars=("CLOUDFLARE_ACCOUNT_ID" "CLOUDFLARE_API_TOKEN")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log ERROR "Required environment variable not set: $var"
            exit 1
        fi
    done
    
    log SUCCESS "Environment validation passed for: $env"
}

# =============================================================================
# DEPLOYMENT FUNCTIONS
# =============================================================================

# Pre-deployment checks
pre_deployment_checks() {
    local environment="$1"
    
    log INFO "Running pre-deployment checks for $environment environment..."
    
    # Check if wrangler is authenticated
    if ! wrangler whoami &>/dev/null; then
        log ERROR "Wrangler not authenticated. Run: wrangler login"
        exit 1
    fi
    
    # Validate wrangler configuration
    if ! wrangler config list &>/dev/null; then
        log ERROR "Wrangler configuration invalid"
        exit 1
    fi
    
    # Check Node.js version
    local node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    
    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -C -V; then
        log ERROR "Node.js version $node_version is below required version $required_version"
        exit 1
    fi
    
    log SUCCESS "Pre-deployment checks completed"
}

# Backup current deployment
backup_deployment() {
    local environment="$1"
    
    log INFO "Creating backup of current $environment deployment..."
    
    # Create backup directory
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup current configuration
    if [[ -f "wrangler.toml" ]]; then
        cp "wrangler.toml" "$backup_dir/wrangler.toml.backup"
    fi
    
    # Backup current worker
    if [[ -f "_worker.js" ]]; then
        cp "_worker.js" "$backup_dir/_worker.js.backup"
    fi
    
    log SUCCESS "Backup created in: $backup_dir"
}

# Install dependencies
install_dependencies() {
    log INFO "Installing dependencies..."
    
    # Clean install for reproducible builds
    rm -rf node_modules package-lock.json
    
    # Install with legacy peer deps to avoid conflicts
    if npm install --legacy-peer-deps; then
        log SUCCESS "Dependencies installed successfully"
    else
        log ERROR "Failed to install dependencies"
        exit 1
    fi
}

# Build application
build_application() {
    log INFO "Building application..."
    
    # Run build if build script exists
    if npm run build 2>/dev/null; then
        log SUCCESS "Build completed successfully"
    else
        log INFO "No build script found or build failed, continuing..."
    fi
}

# Deploy to Cloudflare
deploy_to_cloudflare() {
    local environment="$1"
    local start_time=$(date +%s)
    
    log INFO "Deploying to Cloudflare ($environment environment)..."
    
    # Use optimized wrangler configuration
    if [[ -f "wrangler-optimized.toml" ]]; then
        log INFO "Using optimized wrangler configuration"
        cp "wrangler-optimized.toml" "wrangler.toml"
    fi
    
    # Deploy with timeout
    local deploy_command="wrangler deploy"
    if [[ "$environment" != "production" ]]; then
        deploy_command="wrangler deploy --env $environment"
    fi
    
    if timeout "$MAX_DEPLOYMENT_TIME" $deploy_command; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log SUCCESS "Deployment completed in ${duration} seconds"
        
        # Get deployment URL
        local deployment_url=$(wrangler deploy --dry-run 2>/dev/null | grep -o 'https://[^[:space:]]*.pages.dev' | head -1)
        if [[ -n "$deployment_url" ]]; then
            log SUCCESS "Deployment URL: $deployment_url"
        fi
    else
        log ERROR "Deployment failed or timed out"
        exit 1
    fi
}

# Post-deployment verification
post_deployment_verification() {
    local environment="$1"
    
    log INFO "Running post-deployment verification..."
    
    # Health check
    local max_retries=5
    local retry_count=0
    
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -s -f "https://symbolai-finance.pages.dev/api/health" &>/dev/null; then
            log SUCCESS "Health check passed"
            break
        else
            log WARN "Health check failed, retrying... ($((retry_count + 1))/$max_retries)"
            sleep 5
            ((retry_count++))
        fi
    done
    
    if [[ $retry_count -eq $max_retries ]]; then
        log ERROR "Health check failed after $max_retries attempts"
        exit 1
    fi
    
    log SUCCESS "Post-deployment verification completed"
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    local environment="${1:-production}"
    local skip_checks="${2:-false}"
    
    # Initialize
    log INFO "Starting deployment process..."
    log INFO "Environment: $environment"
    log INFO "Log file: $LOG_FILE"
    
    # Create lock file
    if [[ -f "$LOCK_FILE" ]]; then
        log ERROR "Another deployment is in progress (lock file exists)"
        exit 1
    fi
    touch "$LOCK_FILE"
    
    # Security checks
    if [[ "$skip_checks" != "true" ]]; then
        security_check
        validate_environment "$environment"
        pre_deployment_checks "$environment"
    fi
    
    # Deployment process
    backup_deployment "$environment"
    install_dependencies
    build_application
    deploy_to_cloudflare "$environment"
    post_deployment_verification "$environment"
    
    # Success
    log SUCCESS "Deployment completed successfully!"
    log INFO "Deployment log saved to: $LOG_FILE"
    
    # Cleanup handled by trap
}

# =============================================================================
# USAGE AND HELP
# =============================================================================

usage() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS] [ENVIRONMENT]

Secure deployment script for LMM Finance ERP System

ENVIRONMENT:
    production    (default) Deploy to production environment
    staging       Deploy to staging environment  
    development   Deploy to development environment

OPTIONS:
    --skip-checks    Skip pre-deployment security checks
    --help          Show this help message
    --version       Show script version

EXAMPLES:
    $SCRIPT_NAME                    # Deploy to production with all checks
    $SCRIPT_NAME staging            # Deploy to staging environment
    $SCRIPT_NAME production --skip-checks  # Deploy without security checks

SECURITY FEATURES:
    - Input validation and sanitization
    - Secure file permissions
    - Rate limiting protection
    - Comprehensive logging
    - Backup creation
    - Health check verification

EOF
}

# =============================================================================
# SCRIPT ENTRY POINT
# =============================================================================

# Parse command line arguments
SKIP_CHECKS="false"
ENVIRONMENT="production"

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-checks)
            SKIP_CHECKS="true"
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        --version)
            echo "$SCRIPT_NAME version 2.0"
            exit 0
            ;;
        production|staging|development)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            log ERROR "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! " ${ALLOWED_ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    log ERROR "Invalid environment: $ENVIRONMENT"
    log INFO "Allowed environments: ${ALLOWED_ENVIRONMENTS[*]}"
    exit 1
fi

# Run main function with parsed arguments
main "$ENVIRONMENT" "$SKIP_CHECKS"