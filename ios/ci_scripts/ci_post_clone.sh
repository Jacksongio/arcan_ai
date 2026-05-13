#!/bin/sh
set -e

brew install node cocoapods

export PATH="/usr/local/bin:$PATH"
eval "$(brew shellenv)"

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install
