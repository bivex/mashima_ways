# Backup Script

Smart script for creating project backups with timestamps.

## Features

- ✓ Creates compressed archives with timestamp in filename
- ✓ Excludes `node_modules`, `patchright-nodejs`, `.git`, `.cursor` and other temporary files
- ✓ Estimates backup size before creation
- ✓ Checks git status (optional)
- ✓ Automatically cleans up old backups (keeps last 10)
- ✓ Supports dry-run mode
- ✓ Colored output for easy reading

## Usage

```bash
# Create backup
./backup.sh

# Check size without creating backup
./backup.sh --size-only

# Dry-run mode (show what will be done)
./backup.sh --dry-run

# Check git status before backup
./backup.sh --check-git

# Verbose mode with detailed output
./backup.sh --verbose

# Show help
./backup.sh --help
```

## Excluded Directories and Files

- `node_modules/` - Node.js dependencies
- `patchright-nodejs/` - project-specific folder
- `.git/` - git repository
- `backups/` - backup folder
- `.cursor/` - IDE settings
- `*.log` - log files
- `.DS_Store` - macOS system files
- `*.tmp`, `*.swp`, `*~` - temporary files

## Backup Structure

Backups are saved to `backups/` folder with names like:

```
playwright-scraper-ddd_backup_20251215_203445.tar.gz
```

## Command Examples

```bash
# Quick backup
./backup.sh

# Backup with git check and verbose output
./backup.sh --check-git --verbose

# Estimate size before backup
./backup.sh --size-only
```