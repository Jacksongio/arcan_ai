#!/bin/sh
set -e

brew install node cocoapods

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install
