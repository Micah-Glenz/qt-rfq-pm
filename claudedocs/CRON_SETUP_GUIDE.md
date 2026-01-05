# Cron Job Setup for WSL

Complete guide to setup automated hourly backups on WSL (Windows Subsystem for Linux).

## WSL-Specific Considerations

**Important Differences from Native Linux:**
- Cron doesn't auto-start when WSL boots
- Need to manually start cron service after each WSL restart
- No systemd init system on WSL (by default)
- WSL can be configured to auto-start scripts on boot

## Step 1: Install and Start Cron Service

### Check if cron is installed:
```bash
which cron
# Should output: /usr/sbin/cron
```

### If not installed, install it:
```bash
sudo apt update
sudo apt install cron
```

### Start the cron service:
```bash
sudo service cron start
```

### Verify cron is running:
```bash
sudo service cron status
```

Expected output:
```
 * cron is running
```

## Step 2: Create the Cron Job

### Option A: Using crontab -e (Recommended)

```bash
crontab -e
```

Add this line to run backup every hour at minute 0:
```
0 * * * * /home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py >> /home/micah/qt_rfq_pm/logs/cron.log 2>&1
```

### Option B: Using our automated script (Faster)

```bash
# Add cron job programmatically
(crontab -l 2>/dev/null; echo "0 * * * * /home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py >> /home/micah/qt_rfq_pm/logs/cron.log 2>&1") | crontab -
```

### Verify the cron job was added:
```bash
crontab -l
```

Should output:
```
0 * * * * /home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py >> /home/micah/qt_rfq_pm/logs/cron.log 2>&1
```

## Step 3: Test the Cron Job

Wait until the next hour (e.g., if it's 2:45 PM, wait until 3:00 PM) or force a test:

```bash
# Test manually (runs immediately)
/home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py
```

Check the cron log:
```bash
tail -f /home/micah/qt_rfq_pm/logs/cron.log
```

## Step 4: Auto-Start Cron on WSL Boot

WSL doesn't automatically start services, but you can configure it:

### Option A: WSL Startup Script (Recommended)

Create a startup script:
```bash
nano ~/.bashrc
```

Add these lines at the end:
```bash
# Auto-start cron service for QtRFQM backups
if ! sudo service cron status > /dev/null 2>&1; then
    sudo service cron start > /dev/null 2>&1
fi
```

Now cron will start automatically every time you open a new WSL terminal.

### Option B: Windows Task Scheduler (Auto-start WSL + Cron)

1. Open Task Scheduler in Windows
2. Create a new task
3. Trigger: "At startup" or "When I log on"
4. Action: Run program
   - Program: `wsl.exe`
   - Arguments: `-u root service cron start`
5. Save the task

This ensures cron starts even if you don't open a WSL terminal.

## Cron Schedule Explanation

```
0 * * * * /home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

**Current schedule:** Every hour at minute 0 (1:00, 2:00, 3:00, etc.)

## Alternative Schedules

### Every 30 minutes:
```
*/30 * * * * /home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py >> /home/micah/qt_rfq_pm/logs/cron.log 2>&1
```

### Every 6 hours (4 times daily):
```
0 */6 * * * /home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py >> /home/micah/qt_rfq_pm/logs/cron.log 2>&1
```

### Twice daily (6 AM and 6 PM):
```
0 6,18 * * * /home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py >> /home/micah/qt_rfq_pm/logs/cron.log 2>&1
```

## Monitoring Cron Jobs

### View system cron logs:
```bash
sudo grep CRON /var/log/syslog | tail -20
```

### View your specific cron job logs:
```bash
tail -f /home/micah/qt_rfq_pm/logs/cron.log
```

### List all your cron jobs:
```bash
crontab -l
```

### Remove all cron jobs:
```bash
crontab -r
```

### Edit cron jobs:
```bash
crontab -e
```

## Troubleshooting

### Cron job not running?

1. **Check if cron service is running:**
   ```bash
   sudo service cron status
   # If not running: sudo service cron start
   ```

2. **Verify cron job exists:**
   ```bash
   crontab -l
   ```

3. **Check cron logs for errors:**
   ```bash
   sudo grep CRON /var/log/syslog | tail -20
   ```

4. **Test script manually:**
   ```bash
   /home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py
   ```

5. **Check file permissions:**
   ```bash
   ls -la /home/micah/qt_rfq_pm/scripts/backup_db.py
   # Should be executable (rwxr-xr-x)
   ```

### "permission denied" error

Make script executable:
```bash
chmod +x /home/micah/qt_rfq_pm/scripts/backup_db.py
```

### "python3: command not found"

Use absolute path to python3 in venv:
```bash
# Correct:
/home/micah/qt_rfq_pm/venv/bin/python3 /home/micah/qt_rfq_pm/scripts/backup_db.py

# Wrong (in cron):
python3 /home/micah/qt_rfq_pm/scripts/backup_db.py
```

### WSL shutdown stops cron

**This is normal behavior.** When WSL shuts down, all services stop.

**Solutions:**
1. Open WSL terminal after Windows restart (cron auto-starts via .bashrc script)
2. Use Windows Task Scheduler to auto-start WSL + cron (see Step 4)
3. Run `sudo service cron start` manually after each WSL restart

## Verify Everything is Working

### 1. Check cron is running:
```bash
sudo service cron status
```

### 2. Check cron job is scheduled:
```bash
crontab -l
```

### 3. Monitor next scheduled backup:
```bash
# Watch logs
tail -f /home/micah/qt_rfq_pm/logs/backup.log
tail -f /home/micah/qt_rfq_pm/logs/cron.log
```

### 4. Check Google Drive sync:
```bash
# List backups in Google Drive
rclone ls gdrive:QtRFQM_Backups/hourly
```

## Summary

Once configured:
- ✅ Cron runs backup script every hour automatically
- ✅ Backups synced to Google Drive
- ✅ Old backups cleaned up automatically
- ✅ Logs recorded in `logs/backup.log` and `logs/cron.log`
- ⚠️ Must restart cron service after WSL reboots (or use auto-start script)

## Next Steps

After completing setup:
1. ✅ Verify hourly backups are created in `backups/hourly/`
2. ✅ Check Google Drive for synced backups
3. ✅ Monitor logs for any errors
4. ✅ Restore from backup test (optional, to verify recovery works)

Your database is now protected with automated offsite backups!
