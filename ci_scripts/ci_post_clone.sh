#!/bin/sh
set -e

# Install Node.js via Homebrew (Xcode Cloud images don't include it)
brew install node

# Install JS dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

# Install CocoaPods dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install
