#!/bin/sh
set -e

brew install node cocoapods

# Make node available to Xcode build phases
ln -sf $(which node) /usr/local/bin/node

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install
