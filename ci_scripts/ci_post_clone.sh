#!/bin/sh

# Xcode Cloud post-clone script for ArcanAI
# This script runs after Xcode Cloud clones the repository

set -e

# Change to repository root (script runs from ci_scripts directory)
cd "$(dirname "$0")/.."

echo "=== ArcanAI Xcode Cloud Build Script ==="
echo "Current directory: $(pwd)"
echo "Listing repository root:"
ls -la

echo ""
echo "=== Checking submodules ==="
git submodule status

echo ""
echo "=== Checking if Frameworks directory exists ==="
if [ -d "Frameworks" ]; then
    echo "✅ Frameworks directory exists"
    ls -la Frameworks/
else
    echo "❌ ERROR: No Frameworks directory"
    ls -la
    exit 1
fi

echo ""
echo "=== Checking llama.xcframework ==="
if [ -d "Frameworks/llama.xcframework" ]; then
    echo "✅ llama.xcframework found"
    echo "Framework size:"
    du -sh Frameworks/llama.xcframework
    echo "Framework Info.plist:"
    if [ -f "Frameworks/llama.xcframework/Info.plist" ]; then
        echo "✅ Info.plist exists"
        cat Frameworks/llama.xcframework/Info.plist
    else
        echo "❌ Info.plist missing"
    fi
    echo ""
    echo "Framework structure:"
    find Frameworks/llama.xcframework -type d -maxdepth 2
    echo ""
    echo "Checking binary files:"
    if [ -f "Frameworks/llama.xcframework/ios-arm64/llama.framework/llama" ]; then
        echo "✅ iOS binary exists ($(ls -lh Frameworks/llama.xcframework/ios-arm64/llama.framework/llama | awk '{print $5}'))"
    else
        echo "❌ iOS binary missing"
    fi
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
