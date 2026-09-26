# Commit Message Convention

Yeh project **Conventional Commits** follow karta hai.  
Wrong format mein commit karne par **husky hook reject** kar dega.

---

## Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

---

## Types (mandatory)

| Type | Kab use karo | Example |
|------|-------------|---------|
| `feat` | Naya feature | `feat(finance): add EMI calculator` |
| `fix` | Bug fix | `fix(cart): correct tax calculation` |
| `hotfix` | Emergency prod fix | `hotfix(payment): null order crash` |
| `docs` | Sirf documentation | `docs(readme): update setup steps` |
| `style` | Formatting only | `style: fix indentation in routes` |
| `refactor` | Code restructure | `refactor(auth): extract token utils` |
| `perf` | Performance improvement | `perf(catalog): add DB index` |
| `test` | Tests add/fix | `test(order): add payment unit tests` |
| `build` | Build system / deps | `build(docker): optimize image size` |
| `ci` | CI pipeline changes | `ci: add trivy container scan` |
| `chore` | Tooling, scripts | `chore: update pnpm to 9.15.4` |
| `revert` | Revert a commit | `revert: feat(finance): add EMI` |
| `release` | Version bump | `release: v1.3.0` |
| `db` | DB migration | `db: add finance_applications table` |
| `infra` | K8s / Helm / GCP | `infra(helm): add hpa for bff` |
| `sec` | Security patch | `sec(auth): increase token expiry` |
| `wip` | Work in progress | `wip(loyalty): partial implementation` |

> ⚠️ `wip` **kabhi bhi `main` ya `develop` pe merge mat karo**

---

## Scope (optional, lowercase)

Scope = affected service / package / module

```
feat(auth): ...
fix(bff-api): ...
build(vehicle-catalog): ...
db(payments): ...
ci(github-actions): ...
```

---

## Short Description Rules

- ✅ lowercase shuru karo
- ✅ max 72 characters
- ✅ present tense (`add` not `added`)
- ❌ end mein `.` mat lagao
- ❌ `WIP:`, `FEAT:`, `Fix:` jaisi caps mat karo

---

## Full Example

```
feat(finance): add auto-loan application with EMI persistence

- Validates down payment > 10% of vehicle price
- Auto-approves loans < ₹2 Cr
- Sends loan.applied event to message bus

Closes #42
```

---

## Footer Keywords (GitHub issue linking)

```
Closes #123
Fixes #456
Refs #789
BREAKING CHANGE: old /v1/finance/calc endpoint removed
```

---

## Quick Reference

```bash
# ✅ Sahi
git commit -m "feat(service): add appointment booking"
git commit -m "fix(cart): remove duplicate item on re-add"
git commit -m "ci: add hotfix back-merge workflow"
git commit -m "db: add customer_user_id to service_appointments"

# ❌ Galat — hook reject karega
git commit -m "added new feature"          # no type
git commit -m "Fix Bug"                    # capital, no scope okay but needs lowercase
git commit -m "FEAT: something"            # uppercase type
git commit -m "feat: ."                    # too short subject
git commit -m "wip"                        # no subject
```

---

## Auto-enforcement

- **Local**: Husky `commit-msg` hook runs `commitlint` on every commit
- **CI**: `pr-check.yml` also validates the PR title (should match convention)

If hook fails:
```
⧗   input: added new feature
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
✖   found 2 problems, 0 warnings
```
