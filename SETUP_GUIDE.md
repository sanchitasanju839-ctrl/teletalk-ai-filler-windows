# Teletalk Smart Fill AI - Setup Guide

## Quick Start (For Non-Technical Users)

### Step 1: Install Node.js (One-time setup)
1. Download Node.js from: https://nodejs.org/
2. Install it (choose LTS version)
3. Restart your computer

### Step 2: Install Dependencies (One-time setup)
1. Open Command Prompt in this folder
2. Type: `npm install`
3. Wait for it to finish

### Step 3: Start the Controller (Each time before using)
1. **Double-click `START_CONTROLLER.bat`** in this folder
2. A command window will appear - keep it open
3. You should see: "Teletalk controller running on http://127.0.0.1:3001"

### Step 4: Use the Tool
1. Go to teletalk.com.bd
2. The tool automatically starts the backend on first use
3. Click "Smart Fill" button to fill forms

## How It Works

```
Your Browser (Website)
         ↓
   TamperMonkey Script
         ↓
   Controller (Port 3001) ← Run START_CONTROLLER.bat
         ↓
   Backend Server (Port 3000) ← Auto-starts on demand
```

## Troubleshooting

**Error: "Controller not running at 3001"**
- Solution: Run `START_CONTROLLER.bat`

**Error: "Cannot reach backend at 3000"**
- Wait a few seconds and try again (backend is starting)
- If it persists, check if Node.js is installed: Open Command Prompt and type `node --version`

**Error: "npm is not recognized"**
- Node.js not installed or PATH not set. Restart computer after installing Node.js.

## Features

- **Smart Fill**: AI-powered form filling
- **Force Fill**: Ignore cache and fetch fresh data
- **Start/Stop/Restart**: Manage backend service
- **Clear Cache**: Reset saved form data
- **Auto-Start**: Backend starts automatically when needed

## Buttons Explained

| Button | Function |
|--------|----------|
| Smart Fill | Fill form using cached or new data |
| Force Fill | Bypass cache, get fresh data from AI |
| Clear Cache | Clear saved form data |
| Start | Start the backend service |
| Stop | Stop the backend service |
| Restart | Restart the backend service |
| Fix Port | Kill process on port 3000 and restart |

## Stopping the Service

Click the **"Stop"** button in the tool, or close the `START_CONTROLLER.bat` command window.

---

**That's it!** You don't need to do anything else. Just run the controller once per session and the rest is automatic.
