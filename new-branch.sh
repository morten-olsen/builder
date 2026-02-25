#!/bin/bash

# Helper script to create new branches with custom names
# Usage: ./new-branch.sh [branch-name] [base-branch]

BRANCH_NAME="$1"
BASE_BRANCH="${2:-main}"

if [ -z "$BRANCH_NAME" ]; then
    echo "Enter your branch name:"
    read -p "> " BRANCH_NAME
fi

if [ -z "$BRANCH_NAME" ]; then
    echo "❌ Branch name cannot be empty"
    exit 1
fi

echo "Creating branch '$BRANCH_NAME' from '$BASE_BRANCH'..."

# Switch to base branch and pull latest
git checkout "$BASE_BRANCH" && git pull origin "$BASE_BRANCH"

if [ $? -ne 0 ]; then
    echo "❌ Failed to checkout/update $BASE_BRANCH"
    exit 1
fi

# Create and switch to new branch
git checkout -b "$BRANCH_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Successfully created and switched to branch: $BRANCH_NAME"
    echo "Current branch: $(git branch --show-current)"
else
    echo "❌ Failed to create branch: $BRANCH_NAME"
    exit 1
fi