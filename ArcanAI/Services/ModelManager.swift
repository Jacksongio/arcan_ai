//
//  ModelManager.swift
//  ArcanAI
//
//  Service for managing model downloads and storage
//

import Foundation
import Combine

@MainActor
class ModelManager: ObservableObject {
    static let shared = ModelManager()

    @Published var downloadProgress: [String: Double] = [:]
    @Published var isDownloading: [String: Bool] = [:]
    @Published var downloadedModels: Set<String> = []
    @Published var downloadError: [String: String] = [:]

    private var downloadTasks: [String: URLSessionDownloadTask] = [:]
    private var urlSession: URLSession!
    private let fileManager = FileManager.default

    private init() {
        // Configure URLSession for large file downloads
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 300 // 5 minutes
        config.timeoutIntervalForResource = 3600 // 1 hour
        config.waitsForConnectivity = true
        self.urlSession = URLSession(configuration: config)

        checkDownloadedModels()
    }

    var modelsDirectory: URL {
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let modelsDir = appSupport.appendingPathComponent("ArcanAI/Models")

        // Create directory if it doesn't exist
        if !fileManager.fileExists(atPath: modelsDir.path) {
            try? fileManager.createDirectory(at: modelsDir, withIntermediateDirectories: true)
        }

        return modelsDir
    }

    func checkDownloadedModels() {
        downloadedModels.removeAll()

        for model in MLCModel.availableModels {
            let modelPath = modelsDirectory.appendingPathComponent(model.id)
            if fileManager.fileExists(atPath: modelPath.path) {
                downloadedModels.insert(model.id)
            }
        }
    }

    func downloadModel(_ model: MLCModel) async throws {
        let modelPath = modelsDirectory.appendingPathComponent(model.id)

        isDownloading[model.id] = true
        downloadProgress[model.id] = 0.0
        downloadError[model.id] = nil

        do {
            // Create model directory
            try fileManager.createDirectory(at: modelPath, withIntermediateDirectories: true)

            let filename = model.modelLib  // e.g., "Phi-3-mini-4k-instruct-Q4_K_M.gguf"
            let destinationURL = modelPath.appendingPathComponent(filename)

            // NOTE: Real GGUF downloads are 2-5GB and take a long time
            // For demo purposes, we'll create a placeholder file
            // To enable real downloads, uncomment the code below and comment out the mock

            // MOCK DOWNLOAD (for demo)
            print("Creating mock model file for: \(filename)")

            // Simulate download progress
            for i in 0...100 {
                downloadProgress[model.id] = Double(i) / 100.0
                try await Task.sleep(nanoseconds: 20_000_000) // 0.02 seconds
            }

            // Create placeholder GGUF file
            let placeholderData = """
            Mock GGUF Model File for \(model.name)
            This is a placeholder. Real model would be 2-5GB.
            Model ID: \(model.id)
            Quantization: \(model.quantization)
            """.data(using: .utf8)!

            try placeholderData.write(to: destinationURL)
            print("✅ Created mock model file at: \(destinationURL.path)")

            /* REAL DOWNLOAD (uncomment to enable actual downloads)
            let resolveURL = "\(model.downloadURL)/resolve/main/\(filename)"
            guard let fileURL = URL(string: resolveURL) else {
                throw ModelDownloadError.invalidURL
            }

            print("Downloading \(filename) from \(resolveURL)")
            let (tempURL, response) = try await urlSession.download(from: fileURL)

            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                throw ModelDownloadError.downloadFailed("HTTP error: \(response)")
            }

            if fileManager.fileExists(atPath: destinationURL.path) {
                try fileManager.removeItem(at: destinationURL)
            }
            try fileManager.moveItem(at: tempURL, to: destinationURL)
            */

            downloadProgress[model.id] = 1.0

            // Save model metadata
            let modelInfo: [String: String] = [
                "id": model.id,
                "name": model.name,
                "modelLib": model.modelLib,
                "downloadDate": ISO8601DateFormatter().string(from: Date())
            ]

            let metadataURL = modelPath.appendingPathComponent("model_info.json")
            let jsonData = try JSONSerialization.data(withJSONObject: modelInfo, options: .prettyPrinted)
            try jsonData.write(to: metadataURL)

            downloadedModels.insert(model.id)
            isDownloading[model.id] = false
            downloadProgress[model.id] = 1.0

            print("✅ Model \(model.name) downloaded successfully")

        } catch {
            isDownloading[model.id] = false
            downloadError[model.id] = error.localizedDescription

            // Clean up partial download
            try? fileManager.removeItem(at: modelPath)

            print("❌ Download failed: \(error)")
            throw error
        }
    }

    func cancelDownload(_ modelId: String) {
        downloadTasks[modelId]?.cancel()
        downloadTasks.removeValue(forKey: modelId)
        isDownloading[modelId] = false
        downloadProgress[modelId] = 0.0
    }

    func deleteModel(_ model: MLCModel) throws {
        let modelPath = modelsDirectory.appendingPathComponent(model.id)
        try fileManager.removeItem(at: modelPath)
        downloadedModels.remove(model.id)
    }

    func isModelDownloaded(_ modelId: String) -> Bool {
        downloadedModels.contains(modelId)
    }

    func getDownloadProgress(for modelId: String) -> Double {
        downloadProgress[modelId] ?? 0.0
    }

    func isModelDownloading(_ modelId: String) -> Bool {
        isDownloading[modelId] ?? false
    }

    func getDownloadError(for modelId: String) -> String? {
        downloadError[modelId]
    }
}

enum ModelDownloadError: Error, LocalizedError {
    case downloadFailed(String)
    case invalidURL
    case insufficientStorage

    var errorDescription: String? {
        switch self {
        case .downloadFailed(let message):
            return "Download failed: \(message)"
        case .invalidURL:
            return "Invalid download URL"
        case .insufficientStorage:
            return "Insufficient storage space"
        }
    }
}
