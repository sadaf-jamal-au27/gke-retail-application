# Required GitHub status checks — branch protection

Enable these **required status checks** on `main` and `develop` for pull requests:

| Check name | Workflow file | Runs on |
|---|---|---|
| `PR · Type-check + packages + security` | `pr-check.yml` | Every PR → main / develop / release/v* |
| `S1-A · Secret scan (Gitleaks)` | `ci.yml` | PR + push to main / develop / release / hotfix |
| `S1-B · SAST (CodeQL)` | `ci.yml` | PR + push to main / develop / release / hotfix |
| `S2-A · Type-check` | `ci.yml` | PR + push to main / develop / release / hotfix |
| `S2-B · Dependency scan` | `ci.yml` | PR + push to main / develop / release / hotfix |
| `S3 · Tests` | `ci.yml` | PR + push to main / develop / release / hotfix |
| `S4 · Build <service>` | `ci.yml` | PR + push (matrix per changed service) |
| `S5 · Container scan <service>` | `ci.yml` | PR + push (matrix per changed service) |

> **Recommended branch-protection config:**
> - Require `PR · Type-check + packages + security` on every PR (always runs, no path filter).
> - Require `S3 · Tests` for PRs targeting `main`.
> - All other CI stages are required only when relevant files change (path-filtered).
> - `S6 · Push` and `S7 · SBOM` run only on merged commits — do **not** require as PR gates.

## Workflow map

```
pr-check.yml    →  fast feedback on every PR (~3 min)
ci.yml          →  full DevSecOps pipeline (8 stages, ~15-25 min)
hotfix.yml      →  auto back-merge when hotfix/* merges to main
release.yml     →  GitHub Release + image tagging on main push
build-push.yml  →  MANUAL emergency re-build only (workflow_dispatch)
```

> ⚠️  `build-push.yml` has **no** push/PR triggers intentionally — it is a
> manual break-glass tool. Running it automatically would duplicate `ci.yml`.
