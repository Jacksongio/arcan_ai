#!/bin/sh

# Xcode Cloud post-clone script for ArcanAI
# This script runs after Xcode Cloud clones the repository

set -e

# Change to repository root (script runs from ci_scripts directory)
cd "$(dirname "$0")/.."

echo "=== ArcanAI Xcode Cloud Build Script ==="
echo "Current directory: $(pwd)"

# ===========================================
# Download GGUF model from HuggingFace
# (Bypasses GitHub LFS bandwidth limits)
# ===========================================
MODEL_FILE="gemma-2-2b-it-Q4_K_M.gguf"
MODEL_URL="https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf"

echo ""
echo "=== Downloading GGUF Model ==="

if [ -f "$MODEL_FILE" ]; then
    FILE_SIZE=$(stat -f%z "$MODEL_FILE" 2>/dev/null || stat -c%s "$MODEL_FILE" 2>/dev/null || echo "0")
    # Check if it's a real file (>1GB) or just an LFS pointer (<1KB)
    if [ "$FILE_SIZE" -gt 1000000000 ]; then
        echo "✅ Model file already exists and is valid ($FILE_SIZE bytes)"
    else
        echo "⚠️ Found LFS pointer file, downloading real model..."
        rm -f "$MODEL_FILE"
        curl -L --progress-bar -o "$MODEL_FILE" "$MODEL_URL"
        echo "✅ Model downloaded successfully"
    fi
else
    echo "📥 Downloading model from HuggingFace..."
    curl -L --progress-bar -o "$MODEL_FILE" "$MODEL_URL"
    echo "✅ Model downloaded successfully"
fi

# Verify download
if [ -f "$MODEL_FILE" ]; then
    FINAL_SIZE=$(stat -f%z "$MODEL_FILE" 2>/dev/null || stat -c%s "$MODEL_FILE" 2>/dev/null || echo "0")
    echo "📦 Model file size: $FINAL_SIZE bytes"
    if [ "$FINAL_SIZE" -lt 1000000000 ]; then
        echo "❌ ERROR: Model file seems too small, download may have failed"
        exit 1
    fi
else
    echo "❌ ERROR: Model file not found after download"
    exit 1
fi

echo ""
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
