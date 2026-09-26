#!/usr/bin/env bash
# Build Docker images for all 12 live services locally.
# Usage:
#   ./scripts/docker-build-all.sh           # build all
#   ./scripts/docker-build-all.sh auth bff  # build specific (partial name match)
#   TAG=v1.2.3 ./scripts/docker-build-all.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TAG="${TAG:-local}"
REGISTRY="${REGISTRY:-retail}"  # set to AR URL for push: asia-south1-docker.pkg.dev/PROJECT/retail

SERVICES=(
  auth-service
  vehicle-catalog-service
  vehicle-inventory-service
  dealership-service
  auto-pricing-service
  test-drive-service
  auto-cart-service
  auto-order-service
  auto-finance-service
  service-appointment-service
  trade-in-service
  bff-api-service
)

FILTER=("${@:-}")   # optional name filter args

build_svc() {
  local svc="$1"
  local image="${REGISTRY}/${svc}:${TAG}"
  echo ""
  echo "▶ Building ${svc}  →  ${image}"
  docker build \
    --file "services/${svc}/Dockerfile" \
    --tag "${image}" \
    --tag "${REGISTRY}/${svc}:latest" \
    .
  echo "✓ ${svc}"
}

FAILED=()
for svc in "${SERVICES[@]}"; do
  # Apply filter if args given
  if [[ ${#FILTER[@]} -gt 0 ]]; then
    match=false
    for f in "${FILTER[@]}"; do
      [[ "$svc" == *"$f"* ]] && match=true && break
    done
    $match || continue
  fi

  build_svc "$svc" || FAILED+=("$svc")
done

echo ""
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "FAILED: ${FAILED[*]}"
  exit 1
else
  echo "All images built with tag: ${TAG}"
  echo ""
  echo "To run everything:"
  echo "  docker compose up -d"
  echo ""
  echo "To push to Artifact Registry:"
  echo "  REGISTRY=asia-south1-docker.pkg.dev/ai-rag-agent-project/retail TAG=main-abc123 ./scripts/docker-build-all.sh"
  echo "  docker push <image>"
fi
