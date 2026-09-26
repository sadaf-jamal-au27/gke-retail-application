# Requires GitHub Secrets

Set these in: **GitHub repo → Settings → Secrets and variables → Actions**

## Mandatory (CI will fail without these)

| Secret | Value | Used in |
|--------|-------|---------|
| `GCP_WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER` | Push, SBOM |
| `GCP_CI_SERVICE_ACCOUNT` | `retail-ci-dev@ai-rag-agent-project.iam.gserviceaccount.com` | Push, SBOM |

## Optional

| Secret | Value | Used in |
|--------|-------|---------|
| `GITLEAKS_LICENSE` | License key from gitleaks.io | Gitleaks (free for public repos — skip for OSS) |
| `STATIC_BUCKET` | `ai-rag-agent-project-retail-static-dev` | Storefront upload to GCS |

## How to get WIF values

```bash
# After terraform apply on infra-retail repo:
cd infra-retail/infra/fast/stages/0-bootstrap/github_wif
terraform output workload_identity_provider
terraform output service_account_email
```

## Environment variables (not secrets)

These are already hardcoded in the workflow but can be moved to vars:

| Variable | Value |
|----------|-------|
| `PROJECT_ID` | `ai-rag-agent-project` |
| `REGION` | `asia-south1` |
| `REGISTRY` | `asia-south1-docker.pkg.dev/ai-rag-agent-project/retail` |
