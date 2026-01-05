#!/bin/bash
# Quick start script for cron service

echo "Starting cron service..."
sudo service cron start

if [ $? -eq 0 ]; then
    echo "✓ Cron service started successfully"
    echo ""
    echo "Your cron jobs:"
    crontab -l
    echo ""
    echo "Next backup will run at the top of the next hour."
else
    echo "✗ Failed to start cron service"
    exit 1
fi
