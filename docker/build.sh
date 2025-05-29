#!/usr/bin/env bash

set -e

# Usage: ./build.sh --tag <version>
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="$2"
      shift 2
      ;;
    *)
      echo "Usage: $0 --tag <version>"
      exit 1
      ;;
  esac
done

if [[ -z "$TAG" ]]; then
  echo "ERROR: --tag argument required. Usage: $0 --tag <version>"
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
IMAGE_NAME="ghcr.io/siliconlabssoftware/matter_extension_dependencies"

# Build the Docker image, passing build args
docker build \
  --build-arg SISDK_Tag="$SISDK_Tag" \
  --build-arg WiFI_SDK_Tag="$WiFI_SDK_Tag" \
  -f docker/Dockerfile \
  -t "${IMAGE_NAME}:${TAG}" .

# Push the image
docker push "${IMAGE_NAME}:${TAG}"