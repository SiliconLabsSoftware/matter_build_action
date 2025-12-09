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

| Name                  | Description                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `example-app`         | Example app to build                                                                     |
| `slcp-path`        | Path to the .slcp file (application-only project)                                       |
| `slcw-path`        | Path to the .slcw file (solution with bootloader)                                       |
| `json-file-path`      | JSON content to be used as GN args                                                       |
| `build-script`        | Build script to be executed for the provided example app                                 |
| `output-directory`    | Output directory for the build artifacts                                                 |
| `build-type`          | Defines which build type to use from the json file (standard, full, custom-sqa) |

## Outputs

This action does not produce any outputs.

## Project File Types

This action supports two types of Silicon Labs project files:

- **`.slcp` files**: Application-only projects that contain just the application code
- **`.slcw` files**: Solution projects that include both the application and bootloader components

The action automatically selects the appropriate file based on the `projectFileType` specified in your JSON configuration:
- When `projectFileType: "slcp"` is specified, the action uses the path from `slcp-path`
- When `projectFileType: "slcw"` is specified or omitted, the action uses the path from `slcw-path` (default behavior)

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
          slcp-path: "./path/to/lighting-app.slcp"
          slcw-path: "./path/to/lighting-app.slcw"
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
Additionally, the JSON structure supports multiple build types (e.g., `standard`, `custom-sqa`, and `full`).

The JSON file should follow this structure:

```json
{
  "buildType1": {
    "default": [
      {
        "boards": ["defaultBoard1", "defaultBoard2"],
        "arguments": ["defaultArg1", "defaultArg2"],
        "projectFileType": "slcw"
      }
    ],
    "exampleApp1": [
      {
        "boards": ["board1", "board2"],
        "arguments": ["arg1", "arg2"],
        "projectFileType": "slcp"
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
        "arguments": ["arg3"],
        "projectFileType": "slcw"
      }
    ]
  }
}
```

### Explanation

- **`buildType1`, `buildType2`, etc.**: Represents different build types (e.g., `standard`, `custom-sqa`, or `full`). Each build type contains its own set of configurations.
- **`default`**: Contains build configurations that apply to all example apps for the given build type. Each object in the array specifies:

  - `boards`: A list of board names for which the build should be executed.
  - `arguments`: A list of arguments to pass to the build script.
  - `projectFileType` (optional): Specifies which project file path to use:
    - `"slcp"`: Uses the path from the `slcp-path` input (application-only project)
    - `"slcw"`: Uses the path from the `slcw-path` input (solution with bootloader)
    - If omitted, defaults to `"slcw"`

- **`exampleApp1`, `exampleApp2`, etc.**: Keys representing specific example apps. Each key contains an array of build configurations specific to that app. Each object in the array specifies:
  - `boards`: A list of board names for which the build should be executed.
  - `arguments`: A list of arguments to pass to the build script.
  - `projectFileType` (optional): Specifies which project file path to use:
    - `"slcp"`: Uses the path from the `slcp-path` input (application-only project)
    - `"slcw"`: Uses the path from the `slcw-path` input (solution with bootloader)
    - If omitted, defaults to `"slcw"`

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
        "arguments": ["arg1", "arg2"],
        "projectFileType": "slcp"
      }
    ]
  },
  "custom-sqa": {
    "default": [
      {
        "boards": ["board3"],
        "arguments": ["arg3"]
      }
    ],
    "sample-app-2": [
      {
        "boards": ["board4"],
        "arguments": ["arg4", "--lto"],
        "projectFileType": "slcp"
      }
    ]
  }
}
```

- The `standard` build type will:

  - Run the `default` configuration for `board1` with `arg1` and `arg2` using the path from `slcw-path` (default behavior).
  - Run the `sample-app-1` configuration for `board1` and `board2` with `arg1` and `arg2` using the path from `slcp-path`.

- The `custom-sqa` build type will:
  - Run the `default` configuration for `board3` with `arg3` using the path from `slcw-path` (default behavior).
  - Run the `sample-app-2` configuration for `board4` with `arg4` and `--lto` using the path from `slcp-path`.

This structure provides flexibility to define builds for multiple build types and example apps while maintaining default configurations.
