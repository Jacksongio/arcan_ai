# llama.cpp Integration Guide for ArcanAI

## Current Status (UPDATED)

ArcanAI now downloads **real GGUF models** and has llama.cpp ready:
- ✅ llama.cpp cloned as git submodule
- ✅ Models updated to GGUF format (Q4_K_M quantization)
- ✅ Downloads from bartowski's HuggingFace GGUF repos
- ✅ Beautiful chat UI with streaming ready
- ✅ Navigation and state management
- ⚠️ **Mock AI responses** (llama.cpp C library needs to be built and linked)

## Why Mock Implementation?

MLC LLM doesn't provide a ready-to-use Swift Package. It needs to be built as a framework and integrated manually. This requires:
1. Building MLC LLM from source
2. Creating the iOS framework
3. Adding it to the Xcode project

## Options for Real AI Integration

### Option 1: Use llama.cpp (RECOMMENDED - Easiest)

**Pros:**
- Well-documented iOS integration
- Active community support
- Works with GGUF models (same as MLC)
- Has working Swift examples

**Setup:**
1. Add llama.cpp as a git submodule:
```bash
cd /Users/jacksongio/dev/arcan_ai
git submodule add https://github.com/ggerganov/llama.cpp.git
```

2. Build the iOS library:
```bash
cd llama.cpp
mkdir build-ios
cd build-ios
cmake .. -DCMAKE_SYSTEM_NAME=iOS -DCMAKE_OSX_ARCHITECTURES="arm64"
make
```

3. Add the framework to Xcode project

4. Update `ChatEngine.swift` to use llama.cpp Swift bindings

**Models:** Use GGUF format (same URLs, different file extension)

---

### Option 2: Build MLC LLM from Source (More Complex)

**Pros:**
- Official MLC AI models work directly
- Optimized for Apple Silicon
- Better Metal GPU utilization

**Setup:**

1. Install dependencies:
```bash
brew install cmake python@3.11
pip3 install mlc-ai-nightly mlc-chat-nightly
```

2. Clone MLC LLM:
```bash
cd /Users/jacksongio/dev/arcan_ai
git clone --recursive https://github.com/mlc-ai/mlc-llm.git
```

3. Build for iOS:
```bash
cd mlc-llm/ios
./build.sh
```

4. Add the built framework to Xcode:
   - Drag `MLCChat.framework` to project
   - Add to "Frameworks, Libraries, and Embedded Content"
   - Set to "Embed & Sign"

5. Update `ChatEngine.swift`:
```swift
import MLCChat

@MainActor
class ChatEngine: ObservableObject {
    private var chatModule: ChatModule?

    func loadModel(_ model: MLCModel) async throws {
        chatModule = ChatModule()
        try await chatModule?.reload(modelPath: modelPath)
    }

    func sendMessage(_ text: String, conversationHistory: [Message]) async throws -> AsyncStream<String> {
        return AsyncStream { continuation in
            chatModule?.generate(
                prompt: text,
                streamCallback: { token in
                    continuation.yield(token)
                },
                completion: {
                    continuation.finish()
                }
            )
        }
    }
}
```

---

### Option 3: Use a Simpler Alternative (Quickest Demo)

For a working demo without heavy ML frameworks:

**Use Hugging Face Transformers with CoreML:**

1. Download pre-converted CoreML models:
```bash
# Example: Phi-3 Mini in CoreML format
wget https://huggingface.co/apple/phi-3-mini-4k-instruct-coreml/resolve/main/phi-3-mini-4k-instruct.mlpackage.zip
```

2. Add CoreML model to Xcode

3. Update ChatEngine to use CoreML directly:
```swift
import CoreML

private var model: MLModel?

func loadModel(_ model: MLCModel) async throws {
    let modelURL = modelPath.appendingPathComponent("model.mlpackage")
    self.model = try MLModel(contentsOf: modelURL)
}
```

**Limitation:** Fewer models available in CoreML format

---

## Recommended Path Forward

### For Working Demo NOW:
**Use llama.cpp** - It's the most straightforward and has excellent iOS support.

### For Production App:
**Build MLC LLM** - Better optimization for iOS, official model support.

## Current Mock Behavior

The mock `ChatEngine` currently:
- Simulates 1 second model loading
- Returns a canned response explaining it's a mock
- Demonstrates the streaming UI works correctly
- Shows all UI/UX flows function properly

## Next Steps

1. Choose an integration option above
2. Follow the setup instructions
3. Replace the mock implementation in `ChatEngine.swift`
4. Test with real model inference
5. Adjust UI for real performance characteristics

## Need Help?

- **llama.cpp iOS examples:** `llama.cpp/examples/llama.swiftui/`
- **MLC LLM docs:** https://llm.mlc.ai/docs/deploy/ios.html
- **CoreML docs:** https://developer.apple.com/documentation/coreml
