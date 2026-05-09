# Window Closes Instantly? Here's How to Fix It

## Step 1: Run the Diagnostic

Double-click: **`DIAGNOSE.bat`**

This will show you exactly what's wrong.

---

## Common Issues

### ❌ "Node.js NOT FOUND"

**Solution:**
1. Download Node.js from: https://nodejs.org/
2. Install it (choose LTS version)
3. **Restart your computer** (important!)
4. Try again

### ❌ "npm NOT FOUND"

**Solution:**
1. Uninstall Node.js completely
2. Restart computer
3. Download and reinstall from: https://nodejs.org/
4. Make sure "npm" is checked during installation
5. Restart computer again

### ❌ "node_modules NOT FOUND" or missing files

**Solution:**
1. Open Command Prompt in this folder
2. Run: `npm install`
3. Wait for it to finish (may take 1-2 minutes)
4. Try `START_BACKEND.bat` again

### ❌ "Port 3000 is in use"

**Solution:**
Method 1 (restart computer):
- Restart your computer

Method 2 (kill the process):
- Open Command Prompt as Administrator
- Run: `netstat -ano | findstr :3000`
- Note the PID (last number)
- Run: `taskkill /F /PID {PID}` (replace {PID} with the number)

---

## Step 2: Test Manually

If DIAGNOSE.bat shows everything is OK, try:

1. Open Command Prompt in this folder
2. Run: `npm start`

This will show you the actual error message if something fails.

---

## Step 3: Advanced Test

If `npm start` works in Command Prompt but the batch file still closes:

1. Double-click: **`TEST_NPM_START.bat`**
2. This runs `npm start` but keeps the window open so you can see errors

---

## Still Having Issues?

**Manually verify each step:**

```bash
# Check Node.js
node --version

# Check npm
npm --version

# Check dependencies are installed
npm list express

# Try starting backend
npm start
```

If any of these fail, the output will tell you exactly what's wrong.

---

## Questions?

See `LAUNCHER_GUIDE.md` for more details.
