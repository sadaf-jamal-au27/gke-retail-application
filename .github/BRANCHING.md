# Branching Strategy — GitFlow

## Branch Types

| Branch | Purpose | Targets | CI |
|--------|---------|---------|-----|
| `main` | Production-ready code | — | Full DevSecOps + deploy |
| `develop` | Integration / staging | ← feature, bugfix, chore | Full CI + staging deploy |
| `release/v*.*.*` | Release candidates / QA | → main | Full CI + RC tag push |
| `feature/**` | New features | → develop | PR fast-check only |
| `bugfix/**` | Bug fixes | → develop | PR fast-check only |
| `hotfix/**` | Emergency production fix | → main + auto back-merge to develop | Fast-track CI |
| `chore/**` | Tooling, docs, config | → develop | PR fast-check only |

## Rules

### ❌ You CANNOT push directly to:
- `main`
- `develop`

### ✅ Always:
1. Cut branch **from the right base**
2. Push to your branch
3. Raise a PR
4. CI runs → PR fast-check passes → get 1 approval → merge

---

## Daily Workflow

### New Feature
```bash
git checkout develop && git pull origin develop
git checkout -b feature/JIRA-123-loyalty-points

# ...kaam karo...

git add . && git commit -m "feat: add loyalty points"
git push origin feature/JIRA-123-loyalty-points

gh pr create --base develop \
  --title "feat: add loyalty points" \
  --body "Closes JIRA-123"
```

### Bug Fix
```bash
git checkout develop && git pull origin develop
git checkout -b bugfix/fix-cart-total

git push origin bugfix/fix-cart-total
gh pr create --base develop --title "fix: cart total calculation"
```

### Emergency Hotfix (production pe kuch toot gaya)
```bash
git checkout main && git pull origin main
git checkout -b hotfix/fix-payment-crash

git push origin hotfix/fix-payment-crash
gh pr create --base main --title "fix: payment crash on null order"

# Merge hone ke baad:
# → hotfix.yml automatically main → develop back-merge kar deta hai
```

### Release Cut
```bash
git checkout develop && git pull origin develop
git checkout -b release/v1.3.0

# Final fixes...
git push origin release/v1.3.0
gh pr create --base main --title "release: v1.3.0"

# Merge hone ke baad:
# → release.yml GitHub Release banata hai
# → Images :v1.3.0 tag ke saath AR pe push hoti hain
# → DevOps repo ko deploy event milta hai
```

---

## Image Tags Per Branch

| Branch | Image Tags |
|--------|-----------|
| `main` | `:main-{sha}` `:stable` `:latest` |
| `develop` | `:develop-{sha}` `:develop-latest` |
| `release/v1.3.0` | `:develop-{sha}` `:rc-v1.3.0` `:rc-latest` |
| `hotfix/**` | `:hotfix-{sha}` `:hotfix-latest` |
| PR / feature | Build only — no push |

---

## Branch Protection Summary

| Protection | `main` | `develop` |
|-----------|--------|-----------|
| Direct push | ❌ Blocked | ❌ Blocked |
| PR required | ✅ | ✅ |
| Approvals | 1 + CODEOWNER | 1 |
| Status checks | pr-check + secret-scan + tests | pr-check |
| Linear history (squash) | ✅ | — |
| Dismiss stale reviews | ✅ | — |
| Force push | ❌ | ❌ |
