# matter_build_action

GitHub Action used to build Matter examples with the GN build system.

## Table of Contents

- [Usage](#usage)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Example Workflow](#example-workflow)
- [Setup and Testing](#setup-and-testing)
- [Testing GitHub Actions Locally](#testing-github-actions-locally)
- [Default Builds](#default-builds)

## Usage

To use this action, include it in your workflow YAML file.

## Inputs

| Name                  | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `example-app`         | Example app to build                                                              |
| `path-to-example-app` | Path example directory to be built                                                |
| `json-file-path`      | JSON content to be used as GN args                                                |
| `build-script`        | Build script to be executed for the provided example app                          |
| `output-directory`    | Output directory for the build artifacts                                          |
| `build-type`          | Defines which build type to use from the json file (standard, full, sqa, release) |

## Outputs

This action does not produce any outputs.

## Example Workflow

```yaml
name: Build Matter Example

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2

      - name: Build Matter Example
        uses: ./ # Uses an action in the root directory
        with:
          example-app: "lighting-app"
          path-to-example-app: "./path/to/lighting-app"
          json-file-path: "./path/to/json.json"
          build-script: "./path/to/build_script.sh"
          output-directory: "./path/to/output"
          build-type: "standard"

      - name: Upload Build Artifacts
        uses: actions/upload-artifact@v2
        with:
          name: build
          path: out/examples/lighting-app
```

## Setup and Testing

To set up the repository and run the unit tests, follow these steps:

1. Clone the repository:

```
git clone https://github.com/your-username/matter_build_action.git
cd matter_build_action
```

2. Install dependencies:

```
npm install
```

Run the tests:

```
npm test
```

## Testing GitHub Actions Locally

You can use the `act` tool to test GitHub Actions locally.

1. Install `act`:

```
brew install act
```

2. Run the action locally:

```
act --container-architecture linux/amd64 -W .github/workflows/eslint-check.yml
```

## JSON Structure

The JSON file used by this action supports a flexible structure to define build configurations.
It allows you to specify default builds that apply to all example apps, as well as builds specific to individual example apps.
Additionally, the JSON structure supports multiple build types (e.g., `standard`, `sqa`, `release` and `full`).

The JSON file should follow this structure:

```json
{
  "buildType1": {
    "default": [
      {
        "boards": ["defaultBoard1", "defaultBoard2"],
        "arguments": ["defaultArg1", "defaultArg2"]
      }
    ],
    "exampleApp1": [
      {
        "boards": ["board1", "board2"],
        "arguments": ["arg1", "arg2"]
      }
    ]
  },
  "buildType2": {
    "default": [
      {
        "boards": ["defaultBoard3"],
        "arguments": ["defaultArg3"]
      }
    ],
    "exampleApp2": [
      {
        "boards": ["board3"],
        "arguments": ["arg3"]
      }
    ]
  }
}
```

### Explanation

- **`buildType1`, `buildType2`, etc.**: Represents different build types (e.g., `standard`, `sqa`, `release` or `full`). Each build type contains its own set of configurations.
- **`default`**: Contains build configurations that apply to all example apps for the given build type. Each object in the array specifies:

  - `boards`: A list of board names for which the build should be executed.
  - `arguments`: A list of arguments to pass to the build script.

- **`exampleApp1`, `exampleApp2`, etc.**: Keys representing specific example apps. Each key contains an array of build configurations specific to that app. Each object in the array specifies:
  - `boards`: A list of board names for which the build should be executed.
  - `arguments`: A list of arguments to pass to the build script.

### Example

For the following JSON structure:

```json
{
  "standard": {
    "default": [
      {
        "boards": ["board1"],
        "arguments": ["arg1", "arg2"]
      }
    ],
    "sample-app-1": [
      {
        "boards": ["board1", "board2"],
        "arguments": ["arg1", "arg2"]
      }
    ]
  },
  "sqa": {
    "default": [
      {
        "boards": ["board3"],
        "arguments": ["arg3"]
      }
    ],
    "sample-app-2": [
      {
        "boards": ["board4"],
        "arguments": ["arg4"]
      }
    ]
  }
}
```

- The `standard` build type will:

  - Run the `default` configuration for `board1` with `arg1` and `arg2`.
  - Run the `sample-app-1` configuration for `board1` and `board2` with `arg1` and `arg2`.

- The `sqa` build type will:
  - Run the `default` configuration for `board3` with `arg3`.
  - Run the `sample-app-2` configuration for `board4` with `arg4`.

This structure provides flexibility to define builds for multiple build types and example apps while maintaining default configurations.
