<div align="center">

# ArcanAI

### **Private, offline, on-device LLM for iOS**

[![iOS 18+](https://img.shields.io/badge/iOS-18%2B-blue)](https://developer.apple.com/ios/)
[![Swift](https://img.shields.io/badge/Swift-5.10-orange)](https://swift.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

ArcanAI lets you run open-source LLMs **entirely on your iPhone or iPad** — no internet, no accounts, no cloud. Download once, use forever.

## Features

### Core Experience
- **Zero sign-in** — no email, no tracking, no telemetry
- **100% offline** — complete functionality without internet after initial setup
- **Pre-bundled model** — Gemma 2 2B included, ready to use immediately
- **Custom model import** — bring your own GGUF models

### Chat Interface
- **ChatGPT-style UI** — modern conversation interface with streaming responses
- **Markdown rendering** — code blocks, bold, lists, and formatting
- **Smart token filtering** — clean output without model artifacts
- **Auto-scroll** — chat follows responses as they generate
- **Stop control** — halt generation instantly at any time
- **Conversation history** — persistent chat storage

### Voice Mode
- **Voice conversations** — talk to the AI using speech recognition
- **Text-to-speech** — hear AI responses read aloud
- **Audio visualization** — real-time waveform animation
- **Hands-free operation** — full-screen voice interface

### Performance
- **Metal GPU acceleration** — 20-35 tokens/sec on iPhone 15 Pro
- **Memory optimized** — intelligent KV cache management to prevent crashes
- **Thread-safe** — actor-based architecture for reliable inference

## Supported Models

| Model | Size | Params | Notes |
|-------|------|--------|-------|
| **Gemma 2 2B (Q4)** | 1.7 GB | 2B | Pre-bundled, lightweight |
| **Phi-3 Mini 4K (Q4)** | 2.3 GB | 3.8B | Fast, general purpose |
| **Mistral 7B Instruct (Q4)** | 4.1 GB | 7B | Strong reasoning |
| **Llama 3.1 8B (Q4)** | 4.7 GB | 8B | Best for coding |
| **Custom GGUF** | Varies | Varies | Import your own models |

## Requirements

- **iOS 18+**
- **Apple Silicon** (A17 Pro / M-series recommended)
- **3-6 GB storage** per model
- **Microphone access** (for voice mode)
- **Speech recognition** (for voice mode)

## Privacy

ArcanAI is built with privacy as a core principle:

- **No data collection** — nothing leaves your device
- **No analytics or telemetry**
- **No crash reporting**
- **No network calls** after initial setup
- **No accounts required**

## Technical Stack

| Component | Technology |
|-----------|------------|
| UI Framework | SwiftUI |
| LLM Inference | llama.cpp with Metal |
| Concurrency | Swift async/await, Actor pattern |
| Speech | SFSpeechRecognizer, AVSpeechSynthesizer |
| Audio | AVAudioEngine |

## Project Structure

```
ArcanAI/
├── Models/          # Data models (Message, Conversation, MLCModel)
├── Services/        # Core services (ChatEngine, ModelManager, LibLlama)
├── Views/           # SwiftUI views (ChatView, VoiceMode, ContentView)
└── Utils/           # Utility functions
```

## Building from Source

1. Clone the repository with submodules:
   ```bash
   git clone --recursive https://github.com/yourusername/arcan_ai.git
   ```

2. Open `ArcanAI.xcodeproj` in Xcode 16+

3. Build and run on a physical device (simulator not recommended for performance)

## Importing Custom Models

ArcanAI supports importing custom GGUF model files:

1. Obtain a GGUF-format model (Q4_K_M quantization recommended)
2. Use the model import feature in the app
3. The model will be copied to the app's secure storage

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with llama.cpp**

</div>
