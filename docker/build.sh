# Call docker/sdks/build.sh and pass version as an argument
if [[ "${{ github.event.inputs.tools }}" == "false" ]]; then
  ./docker/sdks/build.sh --tag "$VERSION"
else
  ./docker/tools/build.sh --tag "$VERSION"
fi