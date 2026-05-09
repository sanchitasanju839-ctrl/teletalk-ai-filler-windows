# Teletalk Backend Launcher - User Guide

## 📦 Two Options to Start Backend

### **Option 1: Simple Launcher (Easiest) ⭐ RECOMMENDED**

1. **Double-click `START_BACKEND.bat`**
2. A command window opens showing:
   ```
   ✓ Backend is running on http://127.0.0.1:3000
   ✓ Press Ctrl+C to stop the backend
   ```
3. **Keep this window open** while using Teletalk
4. **Press Ctrl+C** to stop when done

**That's it!** No configuration needed.

---

### **Option 2: GUI Launcher (With Interface)**

**First time only:**
1. Open Command Prompt in this folder
2. Run: `npm install -g electron`
3. Run: `call BUILD_LAUNCHER.bat`

**After that:**
- Double-click `Teletalk-Backend-Launcher.exe` in `launcher/dist/`
- Click "Start Service" button
- Click "Stop Service" to stop

---

## 🚀 How to Use

### Step 1: Run the Launcher
```
Double-click: START_BACKEND.bat
```

### Step 2: Visit Teletalk
1. Go to https://teletalk.com.bd
2. You'll see the "Smart Fill" buttons in the corner

### Step 3: Use Smart Fill
- **Smart Fill**: Use cached data or fetch new
- **Force Fill**: Always get fresh AI data
- **Clear Cache**: Reset saved form mappings

### Step 4: Stop (Optional)
- Close the command window, OR
- Press `Ctrl+C` in the command window

---

## ⚙️ Setup (First Time Only)

### Install Node.js
1. Download from: https://nodejs.org/
2. Install it (LTS version recommended)
3. **Restart your computer**

### Install Dependencies
Open Command Prompt in this folder and run:
```bash
npm install
```

---

## 🆘 Troubleshooting

### "Node.js is not installed"
- Download and install Node.js: https://nodejs.org/
- Restart your computer
- Try again

### "Failed to install dependencies"
- Open Command Prompt in this folder
- Run: `npm install`
- If still fails, delete `node_modules` folder and try again

### "Backend won't start"
- Make sure `npm install` completed successfully
- Check if port 3000 is already in use:
  ```bash
  netstat -ano | findstr :3000
  ```
- If yes, close the other application

### "Backend is running but form filler doesn't work"
- Refresh the Teletalk page
- Make sure you have the latest TamperMonkey script installed
- Check browser console (F12) for errors

---

## 📋 What Each Button Does

| Button | Purpose |
|--------|---------|
| **Smart Fill** | Fill form using AI (caches results) |
| **Force Fill** | Bypass cache, get fresh AI results |
| **Clear Cache** | Delete cached form mappings |
| **Start** | Manually start backend (if not auto-started) |
| **Stop** | Stop the backend service |
| **Restart** | Restart the backend |
| **Fix Port** | Recover if port 3000 is stuck |

---

## 🔧 Advanced

### Run from Command Line
```bash
cd "C:\Users\Sanchita\Desktop\teletalk-ai-filler"
node launcher-simple.js
```

### Build GUI Executable
```bash
call BUILD_LAUNCHER.bat
```

Then run: `launcher\dist\Teletalk-Backend-Launcher.exe`

---

## 📝 Notes

- The launcher keeps the backend running in the background
- Keep the command window open while using Teletalk
- Closing the window stops the backend
- The backend listens on: `http://127.0.0.1:3000`
- Cache is stored in browser's localStorage
- Project folder can be moved anywhere

---

## ❓ Questions?

If something doesn't work:
1. Check the command window for error messages
2. Try running: `npm install` again
3. Make sure Node.js is installed: `node --version`
4. Restart your computer

---

**Enjoy!** 🎉
