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

    // Single pre-bundled model
    static let defaultModel = MLCModel(
        id: "gemma-2-2b-it-Q4_K_M",
        name: "Gemma 2 2B",
        size: "1.7 GB",
        params: "2B",
        description: "Lightweight and fast. Ideal for devices with limited storage.",
        downloadURL: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF",
        modelLib: "gemma-2-2b-it-Q4_K_M.gguf",
        quantization: "Q4_K_M"
    )

    static let availableModels: [MLCModel] = [defaultModel]
}
