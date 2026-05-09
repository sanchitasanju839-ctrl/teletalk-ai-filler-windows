# Quick Start - 30 Seconds

## One-Time Setup

1. **Install Node.js**: https://nodejs.org/ (LTS version)
2. **Restart your computer**
3. **Open Command Prompt** in this folder (Shift+Right-click → "Open PowerShell window here")
4. **Run**: `npm install`

That's it! ✓

---

## Every Time You Use It

### Start Backend
**Double-click**: `START_BACKEND.bat`

You should see:
```
[SUCCESS] Backend is running!
[SUCCESS] URL: http://127.0.0.1:3000
```

Keep this window open. The terminal will NOT close.

### Use Teletalk
1. Go to https://teletalk.com.bd
2. Click **Smart Fill** button (appears in corner)
3. Done!

### Stop Backend
Press **Ctrl+C** in the command window

---

## Buttons on Teletalk Website

| Button | What It Does |
|--------|------------|
| **Smart Fill** | Fill form (uses cached data if available) |
| **Force Fill** | Ignore cache, get fresh AI results |
| **Clear Cache** | Clear saved form data |

---

## Troubleshooting

### Terminal Closes Instantly

**Run this first**: Double-click `DIAGNOSE.bat`

This will show you what's wrong. Then:

**If Node.js is NOT found:**
- Download from https://nodejs.org/
- Install it (LTS version)
- Restart computer
- Try again

**If npm modules are NOT found:**
- Open Command Prompt in this folder
- Run: `npm install`
- Wait for it to finish
- Try `START_BACKEND.bat` again

### Backend Won't Start / Times Out

1. Make sure nothing else is using port 3000
2. Run: `DIAGNOSE.bat` to check
3. If port is in use, close the other application

### Form Won't Fill

1. Make sure `START_BACKEND.bat` terminal is still open
2. Refresh the Teletalk page
3. Try clicking "Smart Fill" again

---

**Questions? See**: `LAUNCHER_GUIDE.md`

