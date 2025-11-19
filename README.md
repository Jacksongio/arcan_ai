
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
- Pre-download model selector — choose Phi-3, Mistral, Llama 3.1, Gemma 2 (Q4/Q5)
- On-device inference via llama.cpp with Metal acceleration (20–35 tokens/sec on iPhone 15 Pro)
- ChatGPT-style UI with streaming responses and conversation history
- Markdown rendering — code blocks, bold, lists, and formatting in responses
- Smart token filtering — clean output without model artifacts
- Auto-scroll — chat follows responses as they generate
- Stop control — halt generation instantly at any time
- Enter to send — natural keyboard messaging experience

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

### 🎉 Today's Major Update (2025-11-19)

**Core Functionality Completed**
- ✅ **Real AI Inference** — Completed full llama.cpp integration with actual on-device LLM generation (no more mock responses!)
- ✅ **Multi-Turn Conversations** — Fixed context management for proper conversation history
- ✅ **Model-Specific Templates** — Added proper chat templates for Llama 3.1, Mistral 7B, Phi-3, and Gemma 2
- ✅ **Smart Token Filtering** — Intelligent buffering removes special tokens (`<start_of_turn>`, `<end_of_turn>`, etc.) for clean output
- ✅ **Thread-Safe Architecture** — Actor-based LlamaContext for safe concurrent access

**User Experience Enhancements**
- ✅ **Markdown Rendering** — Rich text formatting with code blocks, bold, italics, lists, and headers
- ✅ **Auto-Scroll** — Chat automatically follows AI responses as they stream
- ✅ **Loading States** — "Generating..." indicator inside chat bubble before first token
- ✅ **Stop Button** — Immediately halt generation mid-response (with proper cleanup)
- ✅ **Enter to Send** — Press Enter to submit messages naturally
- ✅ **Text Selection** — Copy and paste AI responses

**Technical Improvements**
- ✅ **Proper Task Cancellation** — Stop button actually stops llama.cpp inference (prevents crashes)
- ✅ **State Management** — Clean KV cache clearing between messages
- ✅ **Streaming Pipeline** — Token-by-token generation with intelligent buffering
- ✅ **Regex Filtering** — Catches token variations and edge cases

### Previous Features
- **Landing Page & Model Selector** — Intuitive UI for browsing and selecting models
- **Chat Interface** — ChatGPT-style conversation view with message history
- **Model Management** — Download, caching, and switching capabilities
- **CI/CD Integration** — GitHub Actions workflow for automated reviews
- **llama.cpp Submodule** — Official llama.cpp integration via git submodule

### Technical Stack
- SwiftUI for modern, declarative UI
- llama.cpp with Metal acceleration for GPU inference
- Swift async/await for streaming token generation
- Actor pattern for thread-safe context management

