# Deployment Workflow with Branch Protection

## Daily Development Workflow

### 1️⃣ Always Work on Staging
```bash
git checkout staging
# Make your changes
git add .
git commit -m "Feature: Description"
git push origin staging
```

### 2️⃣ Test in Staging
- Wait for deployment (5-10 min)
- Test at: https://staging.dottapps.com
- Verify everything works

### 3️⃣ Deploy to Production via Pull Request

#### Option A: Using GitHub Website (Recommended)
1. Go to: https://github.com/KuolDimDeng/projectx
2. Click "Pull requests" → "New pull request"
3. Set: base: `main` ← compare: `staging`
4. Review the changes (see diff)
5. Click "Create pull request"
6. Add description of what you tested
7. Click "Merge pull request"
8. Click "Confirm merge"
9. ✅ Production auto-deploys!

#### Option B: Using GitHub CLI
```bash
# Install GitHub CLI first (one-time)
brew install gh

# Create PR from terminal
gh pr create --base main --head staging --title "Deploy: Feature XYZ" --body "Tested in staging"

# View PR in browser
gh pr view --web

# Merge PR
gh pr merge --merge
```

## 🚫 What NO LONGER Works

These commands will be REJECTED:
```bash
git push origin main  # ❌ Rejected
git push origin main --force  # ❌ Rejected
git push origin main --no-verify  # ❌ Rejected
```

Error message you'll see:
```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: At least 1 approving review is required by reviewers with write access.
```

## 🔄 Emergency Rollback

If something goes wrong in production:
1. Go to: https://github.com/KuolDimDeng/projectx/pulls?q=is:merged
2. Find the problematic PR
3. Click "Revert"
4. Merge the revert PR
5. Production rolls back automatically

## 📊 Benefits

1. **Impossible to accidentally deploy** - No more "oops, wrong branch!"
2. **Visual diff review** - See exactly what's changing
3. **Deployment history** - Every PR is a deployment record
4. **Easy rollback** - One-click revert
5. **Self-documenting** - PR descriptions explain what/why

## 🎯 Quick Reference

```bash
# Daily workflow
git checkout staging
# ... work ...
git push origin staging
# ... test ...
# Go to GitHub → Create PR → Merge

# Never do this (won't work anyway)
git checkout main  # ❌
git push origin main  # ❌
```

## 🆘 Disable Protection (Emergency Only)

If you need to temporarily disable:
1. Go to: https://github.com/KuolDimDeng/projectx/settings/branches
2. Click on the `main` rule
3. Uncheck "Include administrators"
4. Save
5. **REMEMBER TO RE-ENABLE!**