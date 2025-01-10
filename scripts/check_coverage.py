#!/usr/bin/env python3

import json
import argparse


def check_coverage(file_path):
    # Open and read the coverage data from the JSON file
    with open(file_path, 'r') as file:
        coverage_data = json.load(file)

    total_statements = 0
    covered_statements = 0

    # Iterate through each file's coverage data
    for file_coverage in coverage_data.values():
        statements = file_coverage['s']
        total_statements += len(statements)
        covered_statements += sum(1 for count in statements.values()
                                  if count > 0)

    # Calculate the coverage percentage
    coverage_percentage = (covered_statements / total_statements) * 100

    # Check if the coverage is 100%
    if coverage_percentage != 100:
        print(
            f"Test coverage is not 100%. Current coverage: {coverage_percentage:.2f}%")
        exit(1)
    else:
        print("Test coverage is 100%")


if __name__ == "__main__":
    # Set up argument parser
    parser = argparse.ArgumentParser(
        description='Check test coverage percentage.')
    parser.add_argument('--file', type=str, default='./coverage/coverage-final.json',
                        help='Path to the coverage JSON file')

    # Parse arguments
    args = parser.parse_args()

    # Check coverage using the provided file path
    check_coverage(args.file)
