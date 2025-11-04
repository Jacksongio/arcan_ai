# ArcanAI Requirements Analysis

## 1. INTRODUCTION
ArcanAI is an iOS-exclusive AI wrapper app enabling users to download, manage, and interact with Ollama-compatible open-source LLMs entirely on-device. All inference runs locally via Core ML + Neural Engine. No internet required post-download. No user accounts or sign-on. Emphasizes zero telemetry, full privacy, offline-first design.

**Name Origin**: "ArcanAI" — from Latin *arcanum* (secret/mystery), reflecting private, self-contained AI.

**Target**: iOS 18+ on Apple Silicon (A17 Pro/M2+ recommended for 7B+ models).

**Core Principle**: Ship with **pre-download options** — users select models in-app for initial install; all subsequent use is **100% offline**.

## 2. OBJECTIVES
- Deliver **private, offline LLM access** on iOS.
- Zero cloud dependency after setup.

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 Model Pre-Download System (Must-Have)
- **In-App Model Selector** at first launch:
  - List 5–7 curated Ollama models (pre-converted to `.mlpackage`).
  - Each with: name, size, params, use case, RAM estimate, download toggle.
  - User checks desired models → "Download Selected" (total size shown).
- **Bundled Fallback**: Include **1 lightweight model (e.g., Phi-3 Mini 4K Q4, ~2.3GB)** in app bundle for instant use.
- **Download Flow**:
  - Only during setup or Settings → "Add Models".
  - Uses `URLSession` + `BGTaskScheduler` for resume on suspend.
  - Progress bar per model + global.
  - Models stored in `Application Support/ArcanAI/Models/` (encrypted container).
- **No Post-Setup Internet**: Catalog hidden after initial download phase.

### 3.2 Model Management
| Feature | Priority |
|-------|----------|
| List installed models with size, version, last used | Must |
| Delete model (frees space) | Must |
| Set default model | Must |
| View model card (license, source, quantization) | Should |

### 3.3 Inference Engine
- **Core ML + `swift-transformers`** for Llama/Mistral/Phi.
- Streaming token output via `MLModel.predict` async stream.
- KV cache for context (up to 4K tokens default).
- Temperature, top-p, max tokens adjustable per chat.
- **No internet calls** — all prompt processing local.

### 3.4 Chat Interface
- SwiftUI-based, ChatGPT-style.
- Persistent history via Core Data (local, encrypted).
- Copy/share/export chat.
- System prompt templates (e.g., "You are a coding assistant").

### 3.5 Onboarding
1. Welcome → "ArcanAI: Private AI, Fully Offline"
2. Model selector screen (pre-download)
3. Permission: Full disk access (for model storage)
4. First chat with bundled model

## 4. NON-FUNCTIONAL REQUIREMENTS

| Category | Requirement |
|--------|-------------|
| **Privacy** | No analytics, no crash reporting, no identifiers. App Privacy Report: "No data collected". |
| **Offline** | 100% functional post-download. No API keys, no registry calls after setup. |
| **Performance** | ≥20 tokens/sec on 7B Q4 (iPhone 15 Pro). Fallback to smaller model if OOM. |
| **Storage** | Warn if <3GB free before download. Auto-clean chat history >30 days. |
| **Security** | Models in encrypted container. App sandboxed. No dynamic code loading. |
| **Usability** | Dark/light mode. Haptics. VoiceOver. |
| **Compatibility** | iPhone & iPad. iOS 18+. Portrait/landscape. |

## 5. TECHNICAL ARCHITECTURE

### Stack
- **Language**: Swift 5.10+
- **UI**: SwiftUI + Combine
- **ML**: Core ML, `swift-transformers` (SPM)
- **Storage**: FileManager (encrypted), Core Data (chat history)
- **Networking**: `URLSession` + `BGProcessingTask` (download only)

### Pre-Converted Model Pipeline
```
Ollama GGUF → (CI/CD) → Core ML Tools (palettize, quantize) → .mlpackage → Hosted on CDN
```
- Host on **Cloudflare R2** or **GitHub Releases**.
- App downloads `.mlpackage` directly — **no on-device conversion**.

### Model Bundle (MVP)
| Model | Size | Params | Use Case | Bundled? |
|-------|------|--------|----------|----------|
| Phi-3 Mini 4K (Q4) | 2.3GB | 3.8B | General, fast | Yes |
| Mistral 7B Instruct (Q4) | 4.1GB | 7B | Reasoning | Optional |
| Llama 3.1 8B (Q4) | 4.7GB | 8B | Coding | Optional |
| Gemma 2 2B (Q5) | 1.6GB | 2B | Lightweight | Optional |

## 6. MVP SCOPE
- First launch: Model selector + download
- Chat with selected model
- Model switcher
- Settings: default model, clear history
- No voice, no tools, no custom model import

## 7. RISKS AND MITIGATIONS
| Risk | Mitigation |
|------|------------|
| Large initial download → App Store rejection | Offer **"Lite" (Phi-3 only)** and **"Pro" (full pack)** via in-app restore |
| OOM on older devices | Detect RAM <8GB → disable 8B models |
| App size >2GB | Use **On-Demand Resources (ODR)** for non-bundled models |
| Slow first chat load | Pre-warm Core ML model in background |

