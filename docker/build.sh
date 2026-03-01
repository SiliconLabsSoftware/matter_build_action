#!/usr/bin/env bash

set -e

# Usage: ./build.sh --tag <version> [--push]
PUSH_IMAGE=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="$2"
      shift 2
      ;;
    --push)
      PUSH_IMAGE=true
      shift
      ;;
    *)
      echo "Usage: $0 --tag <version> [--push]"
      exit 1
      ;;
  esac
done

if [[ -z "$TAG" ]]; then
  echo "ERROR: --tag argument required. Usage: $0 --tag <version> [--push]"
  exit 1
fi

# Example TAG: SiSDKv2024.12.1-0.de_WiFi_SDKv3.4.1
# Extract SISDK_Tag and WiFI_SDK_Tag from TAG
SISDK_Tag=$(echo "$TAG" | sed -n 's/^SiSDK\([^_]*\)_WiFi_SDK.*$/\1/p')
WiFI_SDK_Tag=$(echo "$TAG" | sed -n 's/^SiSDK[^_]*_WiFi_SDK\(.*\)$/\1/p')

if [[ -z "$SISDK_Tag" || -z "$WiFI_SDK_Tag" ]]; then
  echo "ERROR: Could not parse SISDK_Tag or WiFI_SDK_Tag from version tag: $TAG"
  exit 1
fi

echo "Parsed SISDK_Tag: $SISDK_Tag"
echo "Parsed WiFI_SDK_Tag: $WiFI_SDK_Tag"

# Compose image tag
IMAGE_NAME="ghcr.io/siliconlabssoftware/chip-efr32-csa:2025.12.0"

# Build the Docker image, passing build args
docker build \
  -f docker/Dockerfile \
  -t "ghcr.io/siliconlabssoftware/chip-efr32-csa:2025.12.0" .

# Push the image only if --push was provided
if [[ "$PUSH_IMAGE" == "true" ]]; then
  docker push "ghcr.io/siliconlabssoftware/chip-efr32-csa:2025.12.0"
fi