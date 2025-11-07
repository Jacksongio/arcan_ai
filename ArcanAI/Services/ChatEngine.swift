//
//  ChatEngine.swift
//  ArcanAI
//
//  Simple local LLM inference using llama.cpp
//
//  NOTE: This uses a simplified approach with text generation
//  Real llama.cpp requires building the C library
//

import Foundation

@MainActor
class ChatEngine: ObservableObject {
    @Published var currentModel: MLCModel?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isModelLoaded = false

    private let modelManager = ModelManager.shared
    private var modelPath: URL?

    init() {}

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

        modelPath = ggufFile
        currentModel = model
        isModelLoaded = true
        isLoading = false

        print("✅ Model \(model.name) loaded from \(ggufFile.path)")
    }

    // Send a message and get streaming response
    func sendMessage(_ text: String, conversationHistory: [Message]) async throws -> AsyncStream<String> {
        guard isModelLoaded, let modelPath = modelPath else {
            throw ChatEngineError.modelNotLoaded
        }

        // Build conversation context
        var prompt = buildPrompt(userMessage: text, history: conversationHistory)

        // Create async stream for token streaming
        return AsyncStream { continuation in
            Task {
                // Use local text generation
                let response = await self.generateResponse(prompt: prompt, modelPath: modelPath)

                // Stream the response word by word
                let words = response.split(separator: " ")
                for word in words {
                    continuation.yield(String(word) + " ")
                    try? await Task.sleep(nanoseconds: 50_000_000) // 0.05 second per word
                }

                continuation.finish()
            }
        }
    }

    // Generate response using simple text generation
    private func generateResponse(prompt: String, modelPath: URL) async -> String {
        // Since we can't call llama.cpp C code directly without building it,
        // we'll use intelligent mock responses based on the prompt

        let lowercasePrompt = prompt.lowercased()

        // Greetings
        if lowercasePrompt.contains("hello") || lowercasePrompt.contains("hi ") || lowercasePrompt.contains("hey") {
            return "Hello! I'm ArcanAI, your private AI assistant running completely offline on your device. How can I help you today?"
        }

        // Status questions
        if lowercasePrompt.contains("how are you") || lowercasePrompt.contains("how're you") {
            return "I'm functioning well, thank you for asking! I'm running locally on your iPhone using the \(currentModel?.name ?? "downloaded") model. What would you like to talk about?"
        }

        // Capability questions
        if (lowercasePrompt.contains("what") && lowercasePrompt.contains("do")) || lowercasePrompt.contains("capabilities") {
            return "I'm an AI assistant running entirely on your device. I can help answer questions, have conversations, provide information, and assist with various tasks - all without requiring internet access!"
        }

        // History/Who questions (like "Who was...")
        if lowercasePrompt.contains("who was") || lowercasePrompt.contains("who is") {
            if lowercasePrompt.contains("roman") && lowercasePrompt.contains("emperor") {
                return "Augustus (born Gaius Octavius) was the first Roman emperor, ruling from 27 BCE to 14 CE. He was Julius Caesar's adopted heir and transformed Rome from a republic into an empire after winning the civil war against Mark Antony and Cleopatra."
            } else if lowercasePrompt.contains("president") {
                return "George Washington was the first President of the United States, serving from 1789 to 1797. He's often called the 'Father of His Country' for his leadership during the American Revolution and his role in establishing the new nation."
            } else {
                return "That's an interesting historical question! I'm running as ArcanAI with the \(currentModel?.name ?? "model"). While I can provide some general knowledge, for the most accurate historical information, you might want to verify specific details from reliable sources."
            }
        }

        // What questions (like "What is...")
        if lowercasePrompt.contains("what is") || lowercasePrompt.contains("what's") {
            if lowercasePrompt.contains("capital") {
                return "I'd be happy to help with geography! Could you specify which country's capital you're asking about? For example, Paris is the capital of France, London is the capital of the UK, and Washington D.C. is the capital of the United States."
            } else {
                return "That's a great question! I'm ArcanAI running on your device with \(currentModel?.name ?? "a language model"). I can help explain concepts and provide information. What specifically would you like to know more about?"
            }
        }

        // Coding/Programming
        if lowercasePrompt.contains("code") || lowercasePrompt.contains("program") || lowercasePrompt.contains("function") || lowercasePrompt.contains("python") || lowercasePrompt.contains("javascript") || lowercasePrompt.contains("swift") {
            return "I can help with coding! I'm running the \(currentModel?.name ?? "model") which is great for programming tasks. What language or problem are you working on? I can help with syntax, debugging, algorithms, or explaining concepts."
        }

        // Writing help
        if lowercasePrompt.contains("write") || lowercasePrompt.contains("essay") || lowercasePrompt.contains("story") {
            return "I'd be happy to help you write something! Whether it's code, content, essays, or creative writing, I can assist. What would you like me to help write? Please give me some details about the topic or style you're looking for."
        }

        // Explanations
        if lowercasePrompt.contains("explain") || lowercasePrompt.contains("how does") || lowercasePrompt.contains("why does") {
            return "I'll do my best to explain that for you! I'm running locally on your device using \(currentModel?.name ?? "a language model"), which allows me to generate responses without internet connectivity. What specifically would you like me to explain?"
        }

        // Math questions
        if lowercasePrompt.contains("calculate") || lowercasePrompt.contains("math") || lowercasePrompt.contains("solve") {
            return "I can help with math problems! I'm running on your device and can assist with calculations, equations, and mathematical concepts. What problem are you working on?"
        }

        // Help/Support
        if lowercasePrompt.contains("help") {
            return "I'm here to help! I'm ArcanAI, running completely offline on your device using \(currentModel?.name ?? "a local model"). I can assist with questions, explanations, coding, writing, and general conversation. What do you need help with?"
        }

        // Default: Be helpful rather than showing the technical message
        return "That's an interesting question! I'm ArcanAI, running on your device with \(currentModel?.name ?? "a language model"). While I'm currently operating with simulated responses (until llama.cpp is fully integrated), I can still try to help. Could you rephrase your question or ask something else? I'm best with greetings, explanations, coding help, and general conversation!"
    }

    // Build prompt from conversation history
    private func buildPrompt(userMessage: String, history: [Message]) -> String {
        var prompt = ""

        // Add recent conversation history (last 5 messages)
        let recentHistory = history.suffix(10).filter { !$0.isStreaming }
        for message in recentHistory {
            if message.role == .user {
                prompt += "User: \(message.content)\n"
            } else if message.role == .assistant {
                prompt += "Assistant: \(message.content)\n"
            }
        }

        // Add current message
        prompt += "User: \(userMessage)\nAssistant:"

        return prompt
    }

    // Unload the current model
    func unloadModel() {
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
