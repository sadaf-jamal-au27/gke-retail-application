# Testing

```bash
pnpm test:e2e              # smoke testing: DB + catalog + BFF
pnpm test:infra:unit       # Terraform unit (infra lane)
pnpm test:devops           # Helm lint/template
```

Branch protection: see [`gates/REQUIRED_CHECKS.md`](gates/REQUIRED_CHECKS.md).
