# Teletalk Smart Fill AI - Setup Guide

## 📋 Which File Should I Use?

### **I want to start using it NOW**
→ See: **`QUICK_START.md`**

### **The window closes instantly when I double-click START_BACKEND.bat**
→ See: **`WINDOW_CLOSES_FIX.md`**

### **I want detailed setup instructions**
→ See: **`LAUNCHER_GUIDE.md`**

### **I need to diagnose what's wrong**
→ Double-click: **`DIAGNOSE.bat`**

### **I want to test if npm works**
→ Double-click: **`TEST_NPM_START.bat`**

---

## 🚀 Super Quick Start

### One-Time Setup (5 minutes)

1. Install Node.js from: https://nodejs.org/
2. Restart your computer
3. Open Command Prompt in this folder (Shift+Right-click → "Open PowerShell")
4. Run: `npm install`
5. Wait for it to finish

### Each Time You Use (10 seconds)

1. Double-click: **`START_BACKEND.bat`**
2. Go to: https://teletalk.com.bd
3. Click the **"Smart Fill"** button in the corner
4. Done!

To stop: Press `Ctrl+C` in the command window

---

## 📁 File Structure

```
teletalk-ai-filler/
├── START_BACKEND.bat           ← Double-click to start
├── QUICK_START.md              ← Quick setup guide
├── WINDOW_CLOSES_FIX.md        ← If terminal closes instantly
├── LAUNCHER_GUIDE.md           ← Detailed guide
├── DIAGNOSE.bat                ← Check your setup
├── TEST_NPM_START.bat          ← Test npm manually
├── launcher-simple.js
├── package.json
├── src/
│   └── index.ts                ← Backend code
└── ...
```

---

## ❓ Quick Answers

**Q: Where do I click to start?**
A: Double-click `START_BACKEND.bat`

**Q: Where do I click the Smart Fill button?**
A: Go to https://teletalk.com.bd - you'll see buttons in the bottom-right corner

**Q: How do I stop it?**
A: Press `Ctrl+C` in the command window

**Q: Is Node.js free?**
A: Yes! Download from https://nodejs.org/

**Q: Why does my window close instantly?**
A: Something is wrong with your setup. Run `DIAGNOSE.bat` to find out.

**Q: Will it work on other websites?**
A: No, it's only for teletalk.com.bd

---

## 🎯 Common Issues

| Issue | Fix |
|-------|-----|
| Window closes instantly | Run `DIAGNOSE.bat` |
| Node.js not installed | Download from https://nodejs.org/ |
| npm install fails | Delete node_modules, try again |
| Backend won't start | Check if port 3000 is already in use |
| Form won't fill | Make sure terminal is still open |

---

## 📞 Support

1. **Check**: `QUICK_START.md`
2. **Diagnose**: Run `DIAGNOSE.bat`
3. **Troubleshoot**: See `WINDOW_CLOSES_FIX.md`
4. **Learn more**: Read `LAUNCHER_GUIDE.md`

---

Made with ❤️ for Teletalk
