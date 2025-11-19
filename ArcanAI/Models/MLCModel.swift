//
//  MLCModel.swift
//  ArcanAI
//
//  Model definitions for MLC LLM
//

import Foundation

struct MLCModel: Identifiable, Codable {
    let id: String
    let name: String
    let size: String
    let params: String
    let description: String
    let downloadURL: String
    let modelLib: String // Model library name for MLC
    let quantization: String

    var isDownloaded: Bool {
        let modelPath = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("ArcanAI/Models/\(id)")
        return FileManager.default.fileExists(atPath: modelPath.path)
    }

    static let availableModels: [MLCModel] = [
        MLCModel(
            id: "phi-3-mini-4k-instruct-Q4_K_M",
            name: "Phi-3 Mini 4K",
            size: "2.4 GB",
            params: "3.8B",
            description: "Fast and efficient. Great for general conversations and quick responses.",
            downloadURL: "https://huggingface.co/bartowski/Phi-3-mini-4k-instruct-GGUF",
            modelLib: "Phi-3-mini-4k-instruct-Q4_K_M.gguf",
            quantization: "Q4_K_M"
        ),
        MLCModel(
            id: "Mistral-7B-Instruct-v0.3-Q4_K_M",
            name: "Mistral 7B Instruct",
            size: "4.4 GB",
            params: "7B",
            description: "Excellent reasoning capabilities. Best for complex problem-solving.",
            downloadURL: "https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF",
            modelLib: "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf",
            quantization: "Q4_K_M"
        ),
        MLCModel(
            id: "Meta-Llama-3.1-8B-Instruct-Q4_K_M",
            name: "Llama 3.1 8B",
            size: "4.9 GB",
            params: "8B",
            description: "Optimized for coding tasks. Perfect for development assistance.",
            downloadURL: "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",
            modelLib: "Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf",
            quantization: "Q4_K_M"
        ),
        MLCModel(
            id: "gemma-2-2b-it-Q4_K_M",
            name: "Gemma 2 2B",
            size: "1.7 GB",
            params: "2B",
            description: "Lightweight and fast. Ideal for devices with limited storage.",
            downloadURL: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF",
            modelLib: "gemma-2-2b-it-Q4_K_M.gguf",
            quantization: "Q4_K_M"
        )
    ]
}
