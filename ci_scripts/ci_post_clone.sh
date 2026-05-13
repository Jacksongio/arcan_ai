#!/bin/sh
set -e

brew install node cocoapods

export PATH="/usr/local/bin:$PATH"
eval "$(brew shellenv)"

NODE_PATH=$(which node)
echo "export NODE_BINARY=${NODE_PATH}" > "$CI_PRIMARY_REPOSITORY_PATH/ios/.xcode.env.local"

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install
