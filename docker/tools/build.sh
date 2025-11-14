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

# Compose image tag
IMAGE_NAME="ghcr.io/siliconlabssoftware/matter_build_action_tools"

# Build the Docker image, passing build args
docker build \
  -f Dockerfile \
  -t "${IMAGE_NAME}:${TAG}" .

# Push the image only if --push was provided
if [[ "$PUSH_IMAGE" == "true" ]]; then
  docker push "${IMAGE_NAME}:${TAG}"
fi