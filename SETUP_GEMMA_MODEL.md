# Gemma 2 2B Model Setup Guide

This app now uses a **pre-bundled Gemma 2 2B model** instead of requiring users to download models after installation.

## Step 1: Download the Model File

Download the Gemma 2 2B GGUF model file:

**Download URL:**
```
https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf
```

**File Details:**
- Filename: `gemma-2-2b-it-Q4_K_M.gguf`
- Size: ~1.7 GB
- Quantization: Q4_K_M

## Step 2: Add Model to Xcode Project

1. Open your Xcode project (`ArcanAI.xcodeproj`)

2. In Xcode's Project Navigator (left sidebar), right-click on the `ArcanAI` folder

3. Select **"Add Files to 'ArcanAI'..."**

4. Navigate to where you downloaded `gemma-2-2b-it-Q4_K_M.gguf`

5. **IMPORTANT:** Make sure these options are checked:
   - ✅ "Copy items if needed"
   - ✅ "Add to targets: ArcanAI"

6. Click **"Add"**

## Step 3: Verify Build Phase

1. Select the **ArcanAI project** in the Project Navigator

2. Select the **ArcanAI target**

3. Go to **"Build Phases"** tab

4. Expand **"Copy Bundle Resources"**

5. Verify that `gemma-2-2b-it-Q4_K_M.gguf` is listed there
   - If not, click the **"+"** button and add it

## Step 4: Build and Run

1. Build the app (⌘ + B)

2. Run on device or simulator (⌘ + R)

3. The app will:
   - Show "Gemma 2 2B" as the pre-loaded model
   - Copy the model from the bundle to Application Support on first launch
   - Be ready to chat immediately (no download required)

## Troubleshooting

### Model file not found in bundle

If you see "⚠️ Model not found in bundle" in console logs:
1. Check that the `.gguf` file is in your Xcode project
2. Verify it's checked in "Copy Bundle Resources"
3. Clean build folder (⌘ + Shift + K)
4. Rebuild

### App size concerns

The app bundle will increase by ~1.7 GB due to the bundled model. This is expected behavior for pre-bundled models.

### Using placeholder for testing

If you want to test without the full model:
- The app will automatically create a placeholder file if the real model isn't found
- This placeholder won't work for actual inference but allows UI testing

## What Changed

### Removed Components
- ❌ Model selection screen (ModelSelectorView.swift)
- ❌ Multiple model options
- ❌ Download progress UI

### Added Features
- ✅ Single pre-bundled Gemma 2 2B model
- ✅ Automatic model setup on first launch
- ✅ Simplified "Start Chat" button
- ✅ Model info display on home screen

### Modified Files
- `MLCModel.swift` - Only contains Gemma 2 2B definition
- `ContentView.swift` - Removed model selection, added auto-setup
- `ModelManager.swift` - Added `ensureModelAvailable()` for bundle copying

## Development Notes

The app will copy the model file from the app bundle to:
```
~/Library/Application Support/ArcanAI/Models/gemma-2-2b-it-Q4_K_M/
```

This happens automatically on first launch when the user taps "Start Chat".
