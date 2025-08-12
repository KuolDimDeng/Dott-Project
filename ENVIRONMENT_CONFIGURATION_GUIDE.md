# 🔐 Environment Configuration Guide

## 🎯 Key Principle: NEVER Use Same Secrets Across Environments

## 📊 Environment Configuration Matrix

| Variable | Production (Render) | Local Development (.env) | Status |
|----------|-------------------|-------------------------|---------|
| **SECRET_KEY** | `gwlywt_wr^!)s7b#...` | `local-dev-key-do-not...` | ✅ Different |
| **DEBUG** | `False` | `False` | ✅ Always False |
| **DB_PASSWORD** | `@hhl#pPWL2xo9B...` | Local password | ✅ Different |
| **DATABASE_URL** | Render PostgreSQL | Local PostgreSQL | ✅ Different |

## 🚀 Production (Render) Configuration

**Location:** Render Dashboard → Environment Variables

```bash
# REQUIRED - Already Set
SECRET_KEY = gwlywt_wr^!)s7b#+tx$vh(8z^z^1p4r0iu7v+sk7xj1l*8&1p
DB_PASSWORD = @hhl#pPWL2xo9BNCDhT^Obi#XnUTOqNJ
TAX_DB_PASSWORD = @hhl#pPWL2xo9BNCDhT^Obi#XnUTOqNJ
DEBUG = False

# OPTIONAL - Recommended
SESSION_SECRET_KEY = 74f82812659481763fc5ba58aed5db0876dfee7fc0d7d5267ecbc48e5da99481
```

## 💻 Local Development Configuration

**Location:** `/backend/pyfactor/.env` (NOT committed to git)

```bash
# LOCAL ONLY - Different from production
SECRET_KEY='local-dev-key-do-not-use-in-production-xyz123abc'
DEBUG=False  # Keep False for security testing
DB_PASSWORD=local_password_here
DATABASE_URL=postgresql://postgres:local_password@localhost:5432/dott_dev
```

## ⚠️ Security Rules

### ✅ DO:
- Use DIFFERENT keys for each environment
- Keep DEBUG=False everywhere
- Store production secrets ONLY in Render
- Use .env.example files as templates
- Rotate keys regularly

### ❌ DON'T:
- Use production SECRET_KEY locally
- Commit .env files to git
- Share keys between environments
- Use DEBUG=True anywhere
- Copy production credentials locally

## 🔄 How Django Uses SECRET_KEY

```python
# In settings.py
SECRET_KEY = os.getenv('SECRET_KEY')  # Gets from environment

# Used for:
1. Session cookie signing
2. CSRF token generation
3. Password reset tokens
4. Any cryptographic signing
```

## 🛡️ Why Different Keys Matter

### Production SECRET_KEY:
- Signs production sessions
- Validates production CSRF tokens
- Creates production password resets

### Local SECRET_KEY:
- Signs local dev sessions
- Won't work on production
- Isolated from production

**Result:** If local key leaks, production stays safe!

## 📝 Common Scenarios

### Scenario 1: "I used production key locally"
**Risk:** Low if you don't commit it
**Fix:** Change local .env to use different key

### Scenario 2: "I committed .env to git"
**Risk:** HIGH - Keys exposed
**Fix:** 
1. Remove from git history
2. Rotate ALL keys immediately
3. Update Render with new keys

### Scenario 3: "Sessions not working after key change"
**Expected:** Old sessions invalidated
**Fix:** Users need to login again (this is good!)

## 🔍 Verification Commands

### Check if using same key (BAD):
```bash
# If these match, you're using same key (dangerous!)
grep SECRET_KEY backend/pyfactor/.env
# vs
echo "Check Render dashboard for SECRET_KEY"
```

### Verify .env not in git:
```bash
git ls-files | grep -E "\.env$"
# Should return nothing
```

### Test configuration:
```bash
./scripts/security-env-audit.sh
```

## 📋 Quick Checklist

- [ ] Production SECRET_KEY only in Render
- [ ] Local SECRET_KEY different from production
- [ ] DEBUG=False in all environments
- [ ] .env files in .gitignore
- [ ] No secrets in git history
- [ ] Regular key rotation scheduled

## 🚨 Emergency Response

If production SECRET_KEY is compromised:

1. **Immediately in Render:**
   - Generate new SECRET_KEY
   - Update environment variable
   - Restart service

2. **Impact:**
   - All users logged out
   - Password reset links invalidated
   - CSRF tokens regenerated

3. **Communication:**
   - Notify users of security update
   - Require password resets if needed

---

**Remember:** Different keys = Isolated environments = Better security!