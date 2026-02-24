#!/bin/bash

# Smart Backup Script with Timestamp
# Excludes node_modules and patchright-nodejs folders
# Creates compressed archive in backups/ directory

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="playwright-scraper-ddd"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${PROJECT_NAME}_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Files and directories to exclude
EXCLUDE_PATTERNS=(
    "--exclude=./node_modules"
    "--exclude=./patchright-nodejs"
    "--exclude=./.git"
    "--exclude=./backups"
    "--exclude=*.log"
    "--exclude=.DS_Store"
    "--exclude=*.tmp"
    "--exclude=*.swp"
    "--exclude=*~"
    "--exclude=./.cursor"
)

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Smart backup script for ${PROJECT_NAME} project"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help          Show this help message"
    echo "  -d, --dry-run       Show what would be backed up without creating archive"
    echo "  -s, --size-only     Show backup size estimation only"
    echo "  -c, --check-git     Check git status before backup"
    echo "  -v, --verbose       Verbose output"
    echo ""
    echo "EXCLUDED DIRECTORIES:"
    echo "  - node_modules/"
    echo "  - patchright-nodejs/"
    echo "  - .git/"
    echo "  - backups/"
    echo "  - .cursor/"
}

check_dependencies() {
    if ! command -v tar &> /dev/null; then
        log_error "tar command not found. Please install tar."
        exit 1
    fi

    if ! command -v gzip &> /dev/null; then
        log_error "gzip command not found. Please install gzip."
        exit 1
    fi
}

check_git_status() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_warning "Not a git repository"
        return
    fi

    log_info "Checking git status..."

    if [ "$(git status --porcelain)" ]; then
        log_warning "You have uncommitted changes:"
        git status --short
        echo ""
        read -p "Continue with backup anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Backup cancelled by user"
            exit 0
        fi
    else
        log_success "Working directory is clean"
    fi
}

estimate_size() {
    log_info "Estimating backup size..."

    # Simple size estimation by listing files and excluding large directories
    log_info "Scanning project files (excluding node_modules, patchright-nodejs, .git, .cursor)..."

    # Count files that would be included
    FILE_COUNT=$(find . -type f \
        -not -path "./node_modules/*" \
        -not -path "./patchright-nodejs/*" \
        -not -path "./.git/*" \
        -not -path "./backups/*" \
        -not -path "./.cursor/*" \
        -not -name "*.log" \
        -not -name ".DS_Store" \
        -not -name "*.tmp" \
        -not -name "*.swp" \
        -not -name "*~" \
        2>/dev/null | wc -l)

    log_info "Files to backup: $FILE_COUNT"

    # Rough size estimation based on file count and type
    if [ "$FILE_COUNT" -lt 100 ]; then
        log_info "Estimated uncompressed size: < 10 MB"
        log_info "Estimated compressed size: < 5 MB"
    elif [ "$FILE_COUNT" -lt 500 ]; then
        log_info "Estimated uncompressed size: 10-50 MB"
        log_info "Estimated compressed size: 5-25 MB"
    elif [ "$FILE_COUNT" -lt 1000 ]; then
        log_info "Estimated uncompressed size: 50-100 MB"
        log_info "Estimated compressed size: 25-50 MB"
    else
        log_info "Estimated uncompressed size: > 100 MB"
        log_info "Estimated compressed size: > 50 MB"
    fi
}

create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backups directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

perform_backup() {
    log_info "Starting backup: $BACKUP_NAME"

    # Build tar command with all exclude patterns
    TAR_CMD="tar -czf \"$BACKUP_PATH\""

    if [ "$VERBOSE" = true ]; then
        TAR_CMD="$TAR_CMD -v"
    fi

    # Add exclude patterns
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        TAR_CMD="$TAR_CMD $pattern"
    done

    # Add current directory
    TAR_CMD="$TAR_CMD ."

    log_info "Creating archive..."
    if eval "$TAR_CMD"; then
        log_success "Backup completed successfully"
    else
        log_error "Backup failed"
        exit 1
    fi
}

show_backup_info() {
    if [ -f "$BACKUP_PATH" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        # For macOS compatibility, use stat instead of du -b
        BACKUP_SIZE_BYTES=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || echo "unknown")

        log_success "Backup created: $BACKUP_PATH"
        log_info "Archive size: $BACKUP_SIZE ($BACKUP_SIZE_BYTES bytes)"
        log_info "Files included in backup:"

        # Show what was included (excluding the exclude patterns)
        if [ "$VERBOSE" = true ]; then
            tar -tzf "$BACKUP_PATH" | head -20
            TOTAL_FILES=$(tar -tzf "$BACKUP_PATH" | wc -l)
            log_info "Total files in archive: $TOTAL_FILES"
        fi
    fi
}

cleanup_old_backups() {
    # Keep only last 10 backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)

    if [ "$BACKUP_COUNT" -gt 10 ]; then
        log_info "Cleaning up old backups (keeping last 10)..."

        # List backups by date, keep newest 10
        ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +11 | while read -r old_backup; do
            log_info "Removing old backup: $old_backup"
            rm "$old_backup"
        done
    fi
}

# Parse command line arguments
DRY_RUN=false
SIZE_ONLY=false
CHECK_GIT=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -d|--dry-run)
            DRY_RUN=true
            ;;
        -s|--size-only)
            SIZE_ONLY=true
            ;;
        -c|--check-git)
            CHECK_GIT=true
            ;;
        -v|--verbose)
            VERBOSE=true
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
    shift
done

# Main execution
log_info "=== Smart Backup Script for ${PROJECT_NAME} ==="
log_info "Timestamp: $(date)"
log_info "Backup name: $BACKUP_NAME"

# Check dependencies
check_dependencies

# Check git status if requested
if [ "$CHECK_GIT" = true ]; then
    check_git_status
fi

# Estimate size
estimate_size

# Exit if size-only mode
if [ "$SIZE_ONLY" = true ]; then
    exit 0
fi

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN MODE - Would create backup: $BACKUP_PATH"
    log_info "Excluded patterns: ${EXCLUDE_PATTERNS[*]}"
    exit 0
fi

# Create backup directory
create_backup_dir

# Perform backup
perform_backup

# Show backup information
show_backup_info

# Cleanup old backups
cleanup_old_backups

log_success "Backup process completed!"
log_info "Backup location: $(pwd)/$BACKUP_PATH"