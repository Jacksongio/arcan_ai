#!/bin/sh

# Xcode Cloud post-clone script for ArcanAI
# This script runs after Xcode Cloud clones the repository

set -e

echo "=== ArcanAI Xcode Cloud Build Script ==="
echo "Current directory: $(pwd)"
echo "Listing repository root:"
ls -la

echo ""
echo "=== Checking submodules ==="
git submodule status

echo ""
echo "=== Checking if Frameworks directory exists ==="
if [ -d "Frameworks/llama.xcframework" ]; then
    echo "✅ llama.xcframework found in Frameworks/"
    ls -la Frameworks/llama.xcframework/
else
    echo "❌ ERROR: llama.xcframework not found in Frameworks/"
    exit 1
fi

echo ""
echo "=== Checking Xcode project ==="
if [ -f "ArcanAI.xcodeproj/project.pbxproj" ]; then
    echo "✅ Xcode project found"
else
    echo "❌ ERROR: Xcode project not found"
    exit 1
fi

echo ""
echo "=== Listing Swift files ==="
find ArcanAI -name "*.swift" -type f

echo ""
echo "=== Build environment ==="
echo "Xcode version:"
xcodebuild -version
echo ""
echo "Swift version:"
swift --version

echo ""
echo "✅ Post-clone script completed successfully"
