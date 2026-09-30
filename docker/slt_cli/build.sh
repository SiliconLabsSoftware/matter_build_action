#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

# Usage: ./build.sh [--tag <slt-version>] [--push]
# Without --tag, the SLT version is read from the version file.
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
      echo "Usage: $0 [--tag <slt-version>] [--push]"
      exit 1
      ;;
  esac
done

if [[ -z "$TAG" ]]; then
  TAG=$(grep '^SLT_Version=' version | cut -d'=' -f2)
fi

if [[ -z "$TAG" ]]; then
  echo "ERROR: no SLT version. Pass --tag or set SLT_Version in the version file."
  exit 1
fi

# Example TAG: 1.2.2
echo "SLT version: $TAG"

IMAGE_NAME="ghcr.io/siliconlabssoftware/slt-cli"

docker build \
  --platform linux/amd64 \
  --build-arg SLT_VERSION="$TAG" \
  -f Dockerfile \
  -t "${IMAGE_NAME}:${TAG}" .

if [[ "$PUSH_IMAGE" == "true" ]]; then
  docker push "${IMAGE_NAME}:${TAG}"
fi
