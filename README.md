<div align="center">

# ArcanAI

### Private, on-device LLM chat for iOS & Android

[![iOS](https://img.shields.io/badge/iOS-15.5%2B-blue)](https://developer.apple.com/ios/)
[![Android](https://img.shields.io/badge/Android-7%2B-green)](https://www.android.com/)
[![React Native](https://img.shields.io/badge/React%20Native-0.85-61DAFB)](https://reactnative.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

ArcanAI runs open-source LLMs **entirely on your device**. No accounts, no telemetry, no cloud. Bring your own GGUF model.

## Features

- **Bring your own model** — import any `.gguf` file from Hugging Face or elsewhere
- **Streaming chat** — markdown rendering, copy-to-clipboard, conversation history
- **Voice mode** — speech recognition + text-to-speech for hands-free chat
- **Cross-platform** — single React Native codebase for iOS and Android
- **GPU accelerated** — Metal on iOS, Vulkan/OpenCL on Android (via llama.cpp)
- **Privacy-first** — every token is generated locally; nothing leaves the device

## Getting a model

ArcanAI ships empty so you can choose the model that fits your device. The
home screen has a "Browse GGUF models on Hugging Face" button that opens
[https://huggingface.co/models?library=gguf](https://huggingface.co/models?library=gguf&sort=trending).

Recommended starters:

| Model | Size | Notes |
|---|---|---|
| [Gemma 2 2B Instruct (Q4_K_M)](https://huggingface.co/bartowski/gemma-2-2b-it-GGUF) | ~1.7 GB | Easiest to run, good quality |
| [Llama 3.2 3B Instruct (Q4_K_M)](https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF) | ~2.0 GB | Sharper reasoning |
| [Phi 3.5 Mini Instruct (Q4_K_M)](https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF) | ~2.3 GB | Strong instruction following |

Once you've downloaded a `.gguf` file:

1. Tap **Import a .gguf file** on the home screen
2. Pick the file from your Files / Downloads
3. ArcanAI copies it into the app's sandbox; tap the model card to start chatting

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.85 (bare) + TypeScript |
| Inference | [llama.rn](https://github.com/mybigday/llama.rn) (llama.cpp + Metal/Vulkan) |
| State | Zustand (+ MMKV persistence) |
| Navigation | React Navigation v7 (native stack) |
| Speech-to-text | `@react-native-voice/voice` |
| Text-to-speech | `react-native-tts` |
| Markdown | `react-native-markdown-display` |
| Animations | `react-native-reanimated` |

## Project structure

```
src/
├── types/         # MLCModel, Message, Conversation
├── store/         # Zustand slices (MMKV-persisted)
├── services/
│   ├── chatEngine.ts      # streaming orchestrator
│   ├── chatTemplates.ts   # Gemma / Llama / Mistral / Phi / Qwen prompt formats
│   ├── llama.ts           # llama.rn wrapper
│   ├── modelManager.ts    # FS, GGUF import, persistence
│   └── voice.ts           # STT + TTS
├── screens/       # Home, Chat, Voice, ManageModels
├── components/    # MessageBubble, MarkdownText, AudioWaveform, StarfieldBg
├── navigation/    # RootNavigator
├── hooks/         # useMemoryWarning
└── theme/         # colors, spacing
```

## Building from source

### Prerequisites

- Node 22.11+
- Xcode 16+ with Command Line Tools (iOS)
- Android Studio with NDK + an emulator or device (Android)
- Ruby + Bundler (`gem install bundler`) for CocoaPods

### Install

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..
```

### Run

```bash
# iOS — physical device strongly recommended (simulator has no Metal)
npx react-native run-ios

# Android
npx react-native run-android
```

### Scripts

```bash
npm run start     # Metro bundler
npm run ios
npm run android
npm run pods      # bundle exec pod install
npm run lint
npm run test
```

## Permissions

| Platform | Permission | Why |
|---|---|---|
| iOS | `NSMicrophoneUsageDescription` | Voice mode |
| iOS | `NSSpeechRecognitionUsageDescription` | On-device transcription |
| Android | `RECORD_AUDIO` | Voice mode |
| Android | `INTERNET` | Document picker on some OEMs |

## Privacy

- Inference runs on the device. Model weights and your prompts never leave it.
- The only network call the app makes is opening the Hugging Face URL in your
  browser when you tap "Browse GGUF models" on the home screen.
- No analytics, no crash reporting, no telemetry.

## Performance notes

- iOS simulator runs llama.cpp without Metal — expect 2–4 tokens/sec. Test on a real device.
- On Android, performance varies wildly with chipset. A Pixel 7+ or Snapdragon 8 Gen 2+ is comfortable for 2B–3B models.
- Default context is 1024 tokens. Larger contexts trade RAM for memory.
- The app frees the loaded model on iOS `memoryWarning` to prevent OOM kills.

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

**Powered by [llama.cpp](https://github.com/ggerganov/llama.cpp) via [llama.rn](https://github.com/mybigday/llama.rn).**

</div>
