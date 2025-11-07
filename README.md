
<img src="https://images.steamusercontent.com/ugc/831387554223571248/68C537E301D110B6664186D4113E23E7E82C5A0B/?imw=637&imh=358&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true" width="100%"/>
<div align="center">
  
# ArcanAI
### **Private, offline, on-device LLM for iOS.**  

  </div>
<img align = "center" alt="divider" width="9000" src="https://images.hive.blog/DQmPTLhVNyDnLA1pK3vUcmhgCVCDtvqDiE2TE95zU7V5w5Y/hive%20dividers-11.png">


ArcanAI lets you run open-source Ollama models **entirely on your iPhone or iPad** — no internet, no accounts, no cloud. Download once, use forever.

## Features
- Zero sign-in — no email, no tracking, no telemetry
- 100% offline after model download
- Pre-download model selector — choose Phi-3, Mistral, Llama 3.1 (Q4/Q5)
- On-device inference via Core ML + Neural Engine (20–35 tokens/sec on iPhone 15 Pro)
- ChatGPT-style UI with history, system prompts, streaming responses

## Models (Pre-converted `.mlpackage`)
| Model | Size | Params | Use Case |
|-------|------|--------|----------|
| **Phi-3 Mini 4K (Q4)** | 2.3 GB | 3.8B | Fast, general *(bundled)* |
| **Mistral 7B Instruct (Q4)** | 4.1 GB | 7B | Reasoning |
| **Llama 3.1 8B (Q4)** | 4.7 GB | 8B | Coding |
| **Gemma 2 2B (Q5)** | 1.6 GB | 2B | Lightweight |

## Requirements
- iOS 18+
- Apple Silicon (A17 Pro / M2 or later recommended)
- 3–6 GB free storage per model

## Privacy
- **No data collected** (App Store Privacy Report)
- No crash reporting
- No network calls after setup

---

## Recent Updates

### Latest Features
- **Landing Page & Model Selector** — Added intuitive UI for browsing and selecting models before download
- **Chat Interface** — Implemented ChatGPT-style conversation view with streaming responses and message history
- **Core ML Integration** — Built complete inference pipeline using llama.cpp with Core ML acceleration
- **Model Management** — Added download, caching, and switching capabilities for multiple models
- **Conversation System** — Implemented message persistence and conversation history management

### Developer Improvements
- **CI/CD Integration** — Added GitHub Actions workflow for automated Claude Code PR reviews
- **Project Structure** — Organized codebase with clear separation: Views, Models, Services
- **Requirements Analysis** — Documented comprehensive technical requirements and architecture decisions
- **llama.cpp Submodule** — Integrated official llama.cpp as git submodule for native inference

### Technical Stack
- SwiftUI for modern, declarative UI
- Core ML + Neural Engine for on-device acceleration
- llama.cpp for LLM inference
- Async/await for streaming token generation

