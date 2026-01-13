//
//  ChatEngine.swift
//  ArcanAI
//
//  Local LLM inference using llama.cpp
//

import Foundation
import UIKit

@MainActor
class ChatEngine: ObservableObject {
    @Published var currentModel: MLCModel?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isModelLoaded = false

    private let modelManager = ModelManager.shared
    private var modelPath: URL?
    private var llamaContext: LlamaContext?

    init() {
        // Listen for memory warnings and clear KV cache
        NotificationCenter.default.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                print("⚠️ Memory warning in ChatEngine - clearing KV cache")
                await self?.clearKVCache()
            }
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // Load a downloaded model
    func loadModel(_ model: MLCModel) async throws {
        guard modelManager.isModelDownloaded(model.id) else {
            throw ChatEngineError.modelNotDownloaded
        }

        isLoading = true
        errorMessage = nil

        // Get the actual model file path
        let modelDir = modelManager.modelsDirectory.appendingPathComponent(model.id)
        let ggufFile = modelDir.appendingPathComponent(model.modelLib)

        // Check if GGUF file exists
        guard FileManager.default.fileExists(atPath: ggufFile.path) else {
            isLoading = false
            throw ChatEngineError.loadFailed("GGUF file not found at \(ggufFile.path)")
        }

        do {
            // Initialize llama.cpp context
            print("Loading model from \(ggufFile.path)...")
            llamaContext = try await LlamaContext.create_context(path: ggufFile.path)

            modelPath = ggufFile
            currentModel = model
            isModelLoaded = true

            print("✅ Model \(model.name) loaded successfully")

            if let ctx = llamaContext {
                let info = await ctx.model_info()
                print("Model info: \(info)")
            }
        } catch {
            isLoading = false
            throw ChatEngineError.loadFailed("Failed to initialize llama.cpp: \(error.localizedDescription)")
        }

        isLoading = false
    }

    // Send a message and get streaming response
    func sendMessage(_ text: String, conversationHistory: [Message]) async throws -> AsyncStream<String> {
        guard isModelLoaded, let llamaContext = llamaContext else {
            throw ChatEngineError.modelNotLoaded
        }

        // Aggressively clear KV cache on long conversations to prevent memory crashes
        // Clear every 10 messages to keep memory usage stable
        if conversationHistory.count > 10 && conversationHistory.count % 10 == 0 {
            print("⚠️ Long conversation detected (\(conversationHistory.count) messages) - clearing KV cache")
            await llamaContext.clear()
        }

        // Build conversation prompt with chat template
        let prompt = buildPrompt(userMessage: text, history: conversationHistory)

        // Create async stream for token streaming
        return AsyncStream { continuation in
            Task {
                do {
                    // Initialize completion with the prompt
                    await llamaContext.completion_init(text: prompt)

                    var buffer = "" // Buffer to handle multi-token special sequences

                    // Stream tokens as they're generated
                    while await !llamaContext.is_done {
                        // Check if task was cancelled (stop button pressed)
                        if Task.isCancelled {
                            await llamaContext.stop()
                            break
                        }

                        let token = await llamaContext.completion_loop()
                        if !token.isEmpty {
                            buffer += token

                            // Continuously filter the buffer
                            buffer = self.filterSpecialTokens(buffer)

                            // Yield if buffer has content and doesn't look like partial special token
                            if !buffer.isEmpty && !self.mightBePartialSpecialToken(buffer) {
                                // For smoother streaming, yield in chunks at word boundaries
                                if buffer.contains(" ") && buffer.count > 15 {
                                    if let lastSpace = buffer.lastIndex(of: " ") {
                                        let toYield = String(buffer[..<buffer.index(after: lastSpace)])
                                        continuation.yield(toYield)
                                        buffer = String(buffer[buffer.index(after: lastSpace)...])
                                    }
                                } else if buffer.count > 50 {
                                    // Buffer is getting large, yield it
                                    continuation.yield(buffer)
                                    buffer = ""
                                }
                            }
                        }
                    }

                    // Yield any remaining buffer after final filtering
                    if !buffer.isEmpty {
                        buffer = self.filterSpecialTokens(buffer)
                        if !buffer.isEmpty {
                            continuation.yield(buffer)
                        }
                    }

                    continuation.finish()
                } catch {
                    print("Error during inference: \(error)")
                    continuation.finish()
                }
            }
        }
    }

    // Apply chat template based on model type
    private func applyChatTemplate(messages: [(role: String, content: String)]) -> String {
        guard let model = currentModel else {
            return messages.last?.content ?? ""
        }

        // Check both model.id and model.name for matching (important for custom models)
        let modelIdentifier = model.id.lowercased() + " " + model.name.lowercased()

        // Different models use different chat templates
        if modelIdentifier.contains("llama") {
            // Llama 3.1 format
            var prompt = "<|begin_of_text|>"
            for msg in messages {
                if msg.role == "system" {
                    prompt += "<|start_header_id|>system<|end_header_id|>\n\n\(msg.content)<|eot_id|>"
                } else if msg.role == "user" {
                    prompt += "<|start_header_id|>user<|end_header_id|>\n\n\(msg.content)<|eot_id|>"
                } else if msg.role == "assistant" {
                    prompt += "<|start_header_id|>assistant<|end_header_id|>\n\n\(msg.content)<|eot_id|>"
                }
            }
            prompt += "<|start_header_id|>assistant<|end_header_id|>\n\n"
            return prompt
        } else if modelIdentifier.contains("mistral") {
            // Mistral format
            var prompt = ""
            for msg in messages {
                if msg.role == "user" {
                    prompt += "[INST] \(msg.content) [/INST]"
                } else if msg.role == "assistant" {
                    prompt += "\(msg.content)</s>"
                }
            }
            return prompt
        } else if modelIdentifier.contains("phi") {
            // Phi-3 format
            var prompt = ""
            for msg in messages {
                if msg.role == "system" {
                    prompt += "<|system|>\n\(msg.content)<|end|>\n"
                } else if msg.role == "user" {
                    prompt += "<|user|>\n\(msg.content)<|end|>\n"
                } else if msg.role == "assistant" {
                    prompt += "<|assistant|>\n\(msg.content)<|end|>\n"
                }
            }
            prompt += "<|assistant|>\n"
            return prompt
        } else if modelIdentifier.contains("gemma") {
            // Gemma format
            var prompt = "<bos>"
            for msg in messages {
                if msg.role == "user" {
                    prompt += "<start_of_turn>user\n\(msg.content)<end_of_turn>\n"
                } else if msg.role == "assistant" {
                    prompt += "<start_of_turn>model\n\(msg.content)<end_of_turn>\n"
                }
            }
            prompt += "<start_of_turn>model\n"
            return prompt
        } else {
            // Generic/fallback format - use Gemma-style as it's widely compatible
            var prompt = "<bos>"
            for msg in messages {
                if msg.role == "user" {
                    prompt += "<start_of_turn>user\n\(msg.content)<end_of_turn>\n"
                } else if msg.role == "assistant" {
                    prompt += "<start_of_turn>model\n\(msg.content)<end_of_turn>\n"
                }
            }
            prompt += "<start_of_turn>model\n"
            return prompt
        }
    }

    // Check if text might be a partial special token (to buffer it)
    private func mightBePartialSpecialToken(_ text: String) -> Bool {
        let specialTokenPrefixes = [
            "<", "</", "<|", "<e", "<s", "<b", "[", "[I", "[/",
            "<start", "<end"
        ]

        for prefix in specialTokenPrefixes {
            if text.hasSuffix(prefix) || prefix.hasPrefix(text) {
                return true
            }
        }

        return false
    }

    // Filter out special tokens from model output
    private func filterSpecialTokens(_ text: String) -> String {
        var filtered = text

        // List of special tokens to remove (these vary by model)
        let specialTokens = [
            // Common end tokens
            "<|end|>",
            "<|eot_id|>",
            "<end_of_turn>",
            "</end_of_turn>",
            "</s>",
            "<eos>",

            // Role tokens
            "<|assistant|>",
            "<|user|>",
            "<|system|>",

            // Start tokens (these should NEVER appear in output)
            "<start_of_turn>",
            "</start_of_turn>",
            "<start_of_turn>model",
            "<start_of_turn>user",
            "<start_of_turn>model\n",
            "<start_of_turn>user\n",

            // Other special tokens
            "<bos>",
            "[INST]",
            "[/INST]",
            "<|begin_of_text|>",
            "<|start_header_id|>",
            "<|end_header_id|>"
        ]

        for token in specialTokens {
            filtered = filtered.replacingOccurrences(of: token, with: "")
        }

        // Also use regex to catch variations
        filtered = filtered.replacingOccurrences(of: "</?start_of_turn[^>]*>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "</?end_of_turn[^>]*>", with: "", options: .regularExpression)

        // Handle tokenizer splitting tokens with spaces (e.g., "< | e ot _ id | >")
        filtered = filtered.replacingOccurrences(of: "< \\| e ?ot _ id \\| ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< \\| end \\| ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< \\| begin _ of _ text \\| ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< \\| start _ header _ id \\| ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< \\| end _ header _ id \\| ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< \\| assistant \\| ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< \\| user \\| ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< \\| system \\| ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< ?start _ of _ turn ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< ?end _ of _ turn ?>", with: "", options: .regularExpression)
        filtered = filtered.replacingOccurrences(of: "< ?/?bos ?>", with: "", options: .regularExpression)

        return filtered
    }

    // Build prompt from conversation history
    private func buildPrompt(userMessage: String, history: [Message]) -> String {
        var messages: [(role: String, content: String)] = []

        // Add system message with markdown instructions
        messages.append((role: "system", content: "You are a helpful AI assistant running on-device. Be concise and direct - answer fully but avoid unnecessary verbosity or over-explanation. Get straight to the point. Format your responses using markdown: use **bold** for emphasis, `code` for inline code, ```language for code blocks, and - for bullet points."))

        // Reduced from 10 to 6 messages to lower memory usage and prevent KV cache overflow
        // This prevents crashes on longer conversations on memory-constrained devices
        let recentHistory = history.suffix(6).filter { !$0.isStreaming }
        for message in recentHistory {
            if message.role == .user {
                messages.append((role: "user", content: message.content))
            } else if message.role == .assistant {
                messages.append((role: "assistant", content: message.content))
            }
        }

        // Add current message
        messages.append((role: "user", content: userMessage))

        // Apply the appropriate chat template
        return applyChatTemplate(messages: messages)
    }

    // Stop current generation
    func stopGeneration() async {
        if let llamaContext = llamaContext {
            await llamaContext.stop()
        }
    }

    // Clear KV cache to free memory (called on memory warnings)
    func clearKVCache() async {
        if let llamaContext = llamaContext {
            await llamaContext.clear()
            print("✅ KV cache cleared due to memory pressure")
        }
    }

    // Unload the current model
    func unloadModel() {
        llamaContext = nil
        currentModel = nil
        isModelLoaded = false
        modelPath = nil
    }

    // Reset conversation context
    func resetConversation() {
        // Handled by ChatView
    }
}

enum ChatEngineError: Error, LocalizedError {
    case modelNotDownloaded
    case modelNotLoaded
    case loadFailed(String)
    case inferenceFailed(String)

    var errorDescription: String? {
        switch self {
        case .modelNotDownloaded:
            return "Model not downloaded. Please download the model first."
        case .modelNotLoaded:
            return "No model is currently loaded."
        case .loadFailed(let message):
            return "Failed to load model: \(message)"
        case .inferenceFailed(let message):
            return "Inference failed: \(message)"
        }
    }
}
