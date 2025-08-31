# iOS Simulator Update Guide - Reliable Process

## The Problem
Changes to mobile HTML files often don't appear in the iOS simulator due to:
- Xcode Derived Data caching
- WebView caching
- Simulator app caching
- Capacitor sync issues
- Build folder caching

## The Solution: Two Update Scripts

### 1. Full Update Script: `./update-ios.sh`
**When to use:** 
- First update of the day
- After major changes
- When quick update doesn't work
- When you see stale content

**What it does:**
1. Shuts down all simulators
2. Clears Xcode Derived Data (major cache location)
3. Erases all simulator data
4. Copies ALL files from `/out` to iOS
5. Runs full Capacitor sync
6. Updates build timestamp
7. Cleans build folder
8. Updates pods

**Usage:**
```bash
./update-ios.sh
npx cap run ios
```

### 2. Quick Update Script: `./quick-ios.sh`
**When to use:**
- During rapid development
- Small HTML/CSS changes
- When you need fast iteration

**What it does:**
1. Copies changed files only
2. Quick Capacitor copy (no sync)
3. Updates build number to force reload

**Usage:**
```bash
./quick-ios.sh
npx cap run ios
```

## Step-by-Step Workflow

### Initial Setup (Once per session)
```bash
# 1. Make your changes in /out files
# 2. Run full update
./update-ios.sh
# 3. Start simulator
npx cap run ios
```

### During Development (Iterative changes)
```bash
# 1. Make changes to files in /out
# 2. Quick update
./quick-ios.sh
# 3. Restart app in simulator (Cmd+R in Xcode or rebuild)
```

### If Changes Don't Appear
```bash
# Nuclear option - clears everything
./update-ios.sh
npx cap run ios
```

## Xcode Workflow (Alternative)

If you prefer using Xcode directly:

1. Make your changes in `/out`
2. Run: `./quick-ios.sh`
3. In Xcode:
   - Press `Cmd+Shift+K` (Clean Build)
   - Press `Cmd+R` (Run)

## Important Files & Locations

- **Source files:** `/out/mobile-*.html`
- **iOS destination:** `/ios/App/App/public/`
- **Xcode Derived Data:** `~/Library/Developer/Xcode/DerivedData/`
- **Build folder:** `/ios/App/build/`

## Troubleshooting

### Changes still not appearing?

1. **Force quit simulator app**
   - In simulator: Cmd+Shift+H (twice) to show app switcher
   - Swipe up on app to close
   - Re-run from Xcode

2. **Reset simulator completely**
   ```bash
   xcrun simctl erase all
   ./update-ios.sh
   npx cap run ios
   ```

3. **Clear Safari/WebView cache in simulator**
   - In simulator: Settings > Safari > Clear History and Website Data

4. **Check file actually copied**
   ```bash
   ls -la ios/App/App/public/mobile-*.html
   ```

5. **Nuclear option - Fresh start**
   ```bash
   # Delete everything and rebuild
   rm -rf ios/App/App/public/*
   rm -rf ~/Library/Developer/Xcode/DerivedData/*
   ./update-ios.sh
   npx cap run ios
   ```

## Adding New Files

When you create a new mobile HTML file:

1. Add it to `/out/` directory
2. Run `./update-ios.sh` (not quick)
3. The script automatically copies all `mobile-*.html` files

## Cache-Busting in Code

The scripts automatically add cache-busting, but you can also add it in your navigation:

```javascript
// In your navigation functions
function navigateTo(page) {
    window.location.href = page + '?v=' + Date.now();
}
```

## Best Practices

1. **Start fresh each day:** Run `./update-ios.sh` at the beginning of each session
2. **Use quick updates during development:** `./quick-ios.sh` for rapid iteration
3. **Full update after major changes:** New files, structural changes, etc.
4. **Always check the console:** Look for errors in Safari Developer Tools
5. **Keep simulator open:** Faster to restart app than relaunch simulator

## Console Debugging

To see console logs from the simulator:

1. Open Safari on Mac
2. Develop menu > Simulator > Your app
3. Check Console for errors

## The Golden Rule

**If in doubt, run `./update-ios.sh`** - It clears ALL caches and ensures a clean state.

---

Last Updated: 2025-08-31
Scripts Location: `/Users/kuoldeng/projectx/frontend/pyfactor_next/`