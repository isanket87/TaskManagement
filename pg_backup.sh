#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_USER="brioright"
DB_NAME="brioright"
DB_PASS="suN50zWI1I32A42DxqTwhl5FyHOOA"

# Ensure the backup directory exists
mkdir -p $BACKUP_DIR

# Perform the backup (custom compressed format)
PGPASSWORD="$DB_PASS" pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_DIR/${DB_NAME}_${DATE}.dump"

# Delete backups older than 7 days
find $BACKUP_DIR -type f -name "*.dump" -mtime +7 -exec rm {} \;
