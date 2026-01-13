//
//  MLCModel.swift
//  ArcanAI
//
//  Model definitions for MLC LLM
//

import Foundation

struct MLCModel: Identifiable, Codable, Equatable {
    let id: String
    let name: String
    let size: String
    let params: String
    let description: String
    let downloadURL: String
    let modelLib: String // Model library name for MLC
    let quantization: String
    let isCustom: Bool
    let uploadDate: Date?

    var isDownloaded: Bool {
        let modelPath = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("ArcanAI/Models/\(id)")
        return FileManager.default.fileExists(atPath: modelPath.path)
    }

    // Equatable conformance
    static func == (lhs: MLCModel, rhs: MLCModel) -> Bool {
        lhs.id == rhs.id
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
        quantization: "Q4_K_M",
        isCustom: false,
        uploadDate: nil
    )

    static let availableModels: [MLCModel] = [defaultModel]
}

// MARK: - Custom Model Creation
extension MLCModel {
    /// Create a custom model from a .gguf file
    static func fromCustomFile(filename: String, fileURL: URL) -> MLCModel {
        let name = parseModelName(from: filename)
        let params = parseParams(from: filename)
        let quantization = parseQuantization(from: filename)
        let fileSize = getFileSize(at: fileURL)

        return MLCModel(
            id: UUID().uuidString,
            name: name,
            size: fileSize,
            params: params,
            description: "Custom uploaded model",
            downloadURL: "",
            modelLib: filename,
            quantization: quantization,
            isCustom: true,
            uploadDate: Date()
        )
    }

    /// Parse model name from filename
    /// Example: "llama-3-8B-Q4_K_M.gguf" → "Llama 3 8B"
    static func parseModelName(from filename: String) -> String {
        // Remove .gguf extension
        var name = filename.replacingOccurrences(of: ".gguf", with: "")

        // Remove quantization suffix
        let quantPatterns = ["Q4_K_M", "Q4_K_S", "Q5_K_M", "Q5_K_S", "Q8_0", "Q6_K", "Q4_0", "Q3_K_M", "Q2_K"]
        for pattern in quantPatterns {
            name = name.replacingOccurrences(of: "-" + pattern, with: "")
            name = name.replacingOccurrences(of: "_" + pattern, with: "")
        }

        // Convert dashes/underscores to spaces
        name = name.replacingOccurrences(of: "-", with: " ")
            .replacingOccurrences(of: "_", with: " ")

        // Capitalize words
        return name.split(separator: " ")
            .map { $0.capitalized }
            .joined(separator: " ")
    }

    /// Parse parameter count from filename
    /// Example: "llama-3-8B-Q4_K_M.gguf" → "8B"
    static func parseParams(from filename: String) -> String {
        // Look for patterns like 1B, 2B, 7B, 8B, 13B, 70B
        if let regex = try? NSRegularExpression(pattern: "(\\d+)B", options: .caseInsensitive) {
            let nsString = filename as NSString
            if let match = regex.firstMatch(in: filename, range: NSRange(location: 0, length: nsString.length)) {
                return nsString.substring(with: match.range)
            }
        }
        return "Unknown"
    }

    /// Parse quantization type from filename
    /// Example: "llama-3-8B-Q4_K_M.gguf" → "Q4_K_M"
    static func parseQuantization(from filename: String) -> String {
        let quantPatterns = ["Q4_K_M", "Q4_K_S", "Q5_K_M", "Q5_K_S", "Q8_0", "Q6_K", "Q4_0", "Q3_K_M", "Q2_K"]
        for pattern in quantPatterns {
            if filename.contains(pattern) {
                return pattern
            }
        }
        return "Unknown"
    }

    /// Get formatted file size
    static func getFileSize(at url: URL) -> String {
        guard let attributes = try? FileManager.default.attributesOfItem(atPath: url.path),
              let fileSize = attributes[.size] as? Int64 else {
            return "Unknown"
        }

        let gigabytes = Double(fileSize) / 1_000_000_000
        return String(format: "%.1f GB", gigabytes)
    }
}
