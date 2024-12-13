# matter-gn-build-action

GitHub Action used to build Matter examples with the GN build system.

## Table of Contents

- [Usage](#usage)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Example Workflow](#example-workflow)
- [Setup and Testing](#setup-and-testing)
- [Testing GitHub Actions Locally](#testing-github-actions-locally)

## Usage

To use this action, include it in your workflow YAML file.

## Inputs

| Name           | Description                                              |
| -------------- | -------------------------------------------------------- |
| `example-app`  | Example app to build                                     |
| `json-content` | JSON content to be used as GN args                       |
| `build-script` | Build script to be executed for the provided example app |

## Outputs

This action does not produce any outputs.

## Example Workflow

npm test

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
          json-file-path "./path/to/json.json"
          build-script: "./path/to/build_script.sh"

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
git clone https://github.com/your-username/matter-gn-build-action.git
cd matter-gn-build-action
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
