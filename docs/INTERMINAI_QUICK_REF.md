# interminai - Quick Reference (Direct Commands)

## Location
```bash
cd /Volumes/External/Code/GdbDebuggingTutorials/interminai
```

## Basic Commands

### Start lldb
```bash
python3 interminai.py start --socket /tmp/dbg.sock -- lldb /path/to/binary
```

### Attach to process
```bash
python3 interminai.py start --socket /tmp/dbg.sock -- lldb -p <PID>
```

### Send input
```bash
python3 interminai.py input --socket /tmp/dbg.sock --text "command"
```

### Get output
```bash
python3 interminai.py output --socket /tmp/dbg.sock
```

### Stop
```bash
python3 interminai.py stop --socket /tmp/dbg.sock
```

---

## Example: Profile Chrome

```bash
# 1. Start scraper
node tools/long_scrape.js &

# 2. Find Chrome PID
pgrep -f "Chrome Helper"

# 3. Attach lldb
cd /Volumes/External/Code/GdbDebuggingTutorials/interminai
python3 interminai.py start --socket /tmp/chrome.sock -- lldb -p <PID>

# 4. Collect data
python3 interminai.py input --socket /tmp/chrome.sock --text "process status"
python3 interminai.py input --socket /tmp/chrome.sock --text "thread list"
python3 interminai.py output --socket /tmp/chrome.sock

# 5. Stop
python3 interminai.py input --socket /tmp/chrome.sock --text "detach"
python3 interminai.py stop --socket /tmp/chrome.sock
```

That's it. Direct commands only.
