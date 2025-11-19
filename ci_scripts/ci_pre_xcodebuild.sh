#!/bin/sh

# Xcode Cloud pre-xcodebuild script
# Runs just before xcodebuild

set -e

# Change to repository root (script runs from ci_scripts directory)
cd "$(dirname "$0")/.."

echo "=== Pre-xcodebuild Diagnostics ==="

echo "Working directory:"
pwd

echo ""
echo "=== Environment Variables ==="
echo "CI_WORKSPACE: $CI_WORKSPACE"
echo "CI_PRODUCT: $CI_PRODUCT"
echo "CI_XCODEBUILD_ACTION: $CI_XCODEBUILD_ACTION"

echo ""
echo "=== Xcode and Swift Versions ==="
xcodebuild -version
swift --version

echo ""
echo "=== Checking Framework ==="
if [ -f "Frameworks/llama.xcframework/Info.plist" ]; then
    echo "✅ llama.xcframework exists"
    echo "Framework size:"
    du -sh Frameworks/llama.xcframework
    echo "Framework contents:"
    ls -la Frameworks/llama.xcframework/
else
    echo "❌ ERROR: llama.xcframework missing!"
    echo "Current directory contents:"
    ls -laR Frameworks/ 2>/dev/null || echo "No Frameworks directory!"
    exit 1
fi

echo ""
echo "=== Checking Swift Files ==="
echo "Swift files count: $(find ArcanAI -name '*.swift' | wc -l)"
find ArcanAI -name '*.swift' | sort

echo ""
echo "=== Checking Assets ==="
if [ -d "ArcanAI/Assets.xcassets/AppIcon.appiconset" ]; then
    echo "✅ AppIcon exists"
    ls -la ArcanAI/Assets.xcassets/AppIcon.appiconset/
else
    echo "⚠️  AppIcon might be missing"
fi

echo ""
echo "✅ Pre-xcodebuild script completed"
