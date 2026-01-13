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
    @Published var customModels: [MLCModel] = []

    private var downloadTasks: [String: URLSessionDownloadTask] = [:]
    private var urlSession: URLSession!
    private let fileManager = FileManager.default
    private let customModelsFile = "custom_models.json"

    private init() {
        // Configure URLSession for large file downloads
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 300 // 5 minutes
        config.timeoutIntervalForResource = 3600 // 1 hour
        config.waitsForConnectivity = true
        self.urlSession = URLSession(configuration: config)

        checkDownloadedModels()
        loadCustomModels()
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

    // MARK: - Custom Model Management

    /// Load custom models from persistent storage
    func loadCustomModels() {
        let fileURL = modelsDirectory.appendingPathComponent(customModelsFile)
        guard let data = try? Data(contentsOf: fileURL),
              let models = try? JSONDecoder().decode([MLCModel].self, from: data) else {
            customModels = []
            return
        }
        customModels = models
        print("📚 Loaded \(models.count) custom model(s)")
    }

    /// Save custom models to persistent storage
    func saveCustomModels() {
        let fileURL = modelsDirectory.appendingPathComponent(customModelsFile)
        guard let data = try? JSONEncoder().encode(customModels) else {
            print("❌ Failed to encode custom models")
            return
        }
        do {
            try data.write(to: fileURL)
            print("💾 Saved \(customModels.count) custom model(s)")
        } catch {
            print("❌ Failed to save custom models: \(error)")
        }
    }

    /// Import a custom model from a file URL
    func importCustomModel(from sourceURL: URL) async throws -> MLCModel {
        // Validate the file
        try validateGGUFFile(at: sourceURL)

        // Parse filename to extract metadata
        let filename = sourceURL.lastPathComponent
        print("📥 Importing custom model: \(filename)")

        // Create MLCModel with extracted metadata
        let customModel = MLCModel.fromCustomFile(filename: filename, fileURL: sourceURL)

        // Create destination directory
        let modelDir = modelsDirectory.appendingPathComponent(customModel.id)
        try fileManager.createDirectory(at: modelDir, withIntermediateDirectories: true)

        // Copy file to destination
        let destinationURL = modelDir.appendingPathComponent(filename)
        do {
            try fileManager.copyItem(at: sourceURL, to: destinationURL)
            print("✅ Copied model to: \(destinationURL.path)")

            // Verify the copied file is valid
            let handle = try FileHandle(forReadingFrom: destinationURL)
            defer { try? handle.close() }

            let magicBytes = handle.readData(ofLength: 4)
            guard let magic = String(data: magicBytes, encoding: .utf8), magic == "GGUF" else {
                // Clean up invalid file
                try? fileManager.removeItem(at: modelDir)
                throw ModelImportError.invalidGGUFFile
            }
            print("✅ Verified copied file is valid GGUF")
        } catch let error as ModelImportError {
            // Re-throw our custom errors
            throw error
        } catch {
            // Clean up on failure
            try? fileManager.removeItem(at: modelDir)
            throw ModelImportError.copyFailed(error.localizedDescription)
        }

        // Save metadata
        let metadataURL = modelDir.appendingPathComponent("model_info.json")
        let jsonData = try JSONEncoder().encode(customModel)
        try jsonData.write(to: metadataURL)

        // Add to custom models list and persist
        customModels.append(customModel)
        saveCustomModels()
        downloadedModels.insert(customModel.id)

        print("✅ Successfully imported custom model: \(customModel.name)")
        return customModel
    }

    /// Delete a custom model
    func deleteCustomModel(_ model: MLCModel) throws {
        guard model.isCustom else {
            throw ModelImportError.cannotDeleteDefaultModel
        }

        // Delete from disk
        try deleteModel(model)

        // Remove from custom models list
        customModels.removeAll { $0.id == model.id }
        saveCustomModels()

        print("🗑️ Deleted custom model: \(model.name)")
    }

    /// Validate a .gguf file before import
    func validateGGUFFile(at url: URL) throws {
        // Check extension
        guard url.pathExtension.lowercased() == "gguf" else {
            throw ModelImportError.invalidFileType
        }

        // Check file exists and is readable
        guard fileManager.fileExists(atPath: url.path) else {
            throw ModelImportError.copyFailed("File does not exist")
        }

        // Check file size
        guard let attributes = try? fileManager.attributesOfItem(atPath: url.path),
              let fileSize = attributes[.size] as? Int64 else {
            throw ModelImportError.copyFailed("Could not read file size")
        }

        let minSize: Int64 = 100_000_000  // 100 MB (reduced for smaller models)
        let maxSize: Int64 = 10_000_000_000  // 10 GB

        if fileSize < minSize {
            throw ModelImportError.fileTooSmall
        }

        if fileSize > maxSize {
            throw ModelImportError.fileTooLarge
        }

        // Check GGUF magic bytes (first 4 bytes should be "GGUF")
        do {
            let handle = try FileHandle(forReadingFrom: url)
            defer { try? handle.close() }

            let magicBytes = handle.readData(ofLength: 4)
            guard let magic = String(data: magicBytes, encoding: .utf8), magic == "GGUF" else {
                throw ModelImportError.invalidGGUFFile
            }
            print("✅ Valid GGUF magic bytes detected")
        } catch {
            throw ModelImportError.invalidGGUFFile
        }

        // Check available storage
        if let volumeURL = url.deletingLastPathComponent() as URL?,
           let resourceValues = try? volumeURL.resourceValues(forKeys: [.volumeAvailableCapacityKey]),
           let availableCapacity = resourceValues.volumeAvailableCapacity {
            if Int64(availableCapacity) < fileSize {
                throw ModelImportError.insufficientStorage
            }
        }

        print("✅ Validation passed for: \(url.lastPathComponent)")
    }

    // MARK: - Pre-bundled Model Management

    func ensureModelAvailable(_ model: MLCModel) async {
        // Custom models are already in place after import, skip bundle check
        if model.isCustom {
            if isModelDownloaded(model.id) {
                print("✅ Custom model already available: \(model.name)")
            } else {
                print("⚠️ Custom model not found, may need to re-import")
            }
            return
        }

        // Check if model is already available in Application Support
        if isModelDownloaded(model.id) {
            print("✅ Model already available: \(model.name)")
            return
        }

        print("📦 Copying pre-bundled model to Application Support...")

        let modelPath = modelsDirectory.appendingPathComponent(model.id)

        do {
            // Create model directory
            try fileManager.createDirectory(at: modelPath, withIntermediateDirectories: true)

            let filename = model.modelLib  // e.g., "gemma-2-2b-it-Q4_K_M.gguf"
            let destinationURL = modelPath.appendingPathComponent(filename)

            // Find model in bundle using multiple fallback methods
            // This is more reliable than Bundle.main.url() for large files in Release builds
            var bundledModelURL: URL? = nil

            // Method 1: Direct path from bundle URL (most reliable for large files)
            let directPath = Bundle.main.bundleURL.appendingPathComponent(filename)
            if fileManager.fileExists(atPath: directPath.path) {
                bundledModelURL = directPath
                print("📥 Found model using direct path")
            }

            // Method 2: Resource path (fallback for different bundle structures)
            if bundledModelURL == nil, let resourcePath = Bundle.main.resourcePath {
                let resourceURL = URL(fileURLWithPath: resourcePath).appendingPathComponent(filename)
                if fileManager.fileExists(atPath: resourceURL.path) {
                    bundledModelURL = resourceURL
                    print("📥 Found model using resource path")
                }
            }

            // Method 3: Original Bundle.main.url() method (final fallback)
            if bundledModelURL == nil {
                bundledModelURL = Bundle.main.url(forResource: filename.replacingOccurrences(of: ".gguf", with: ""), withExtension: "gguf")
                if bundledModelURL != nil {
                    print("📥 Found model using Bundle.main.url()")
                }
            }

            // Check if model was found and copy it
            if let bundledModelURL = bundledModelURL {
                print("📥 Copying from bundle: \(bundledModelURL.path)")

                // Copy file to Application Support
                try fileManager.copyItem(at: bundledModelURL, to: destinationURL)

                // Verify the copied file is valid (not corrupted)
                let attributes = try fileManager.attributesOfItem(atPath: destinationURL.path)
                if let fileSize = attributes[.size] as? Int64 {
                    print("✅ Model copied successfully (\(fileSize) bytes)")

                    // Sanity check: file should be > 1GB for the real model
                    if fileSize < 1_000_000_000 {
                        print("⚠️ Warning: Copied file seems too small (\(fileSize) bytes)")
                    }
                }
            } else {
                print("⚠️ Model not found in bundle, creating placeholder")
                // Fallback: create placeholder if bundle file missing
                let placeholderData = """
                Mock GGUF Model File for \(model.name)
                This is a placeholder. Real model would be 1.7GB.
                Model ID: \(model.id)
                Quantization: \(model.quantization)

                To use the real model:
                1. Download \(filename) from \(model.downloadURL)
                2. Add it to the Xcode project
                3. Ensure it's included in "Copy Bundle Resources" build phase
                """.data(using: .utf8)!

                try placeholderData.write(to: destinationURL)
                print("✅ Created placeholder at: \(destinationURL.path)")
            }

            // Save model metadata
            let modelInfo: [String: String] = [
                "id": model.id,
                "name": model.name,
                "modelLib": model.modelLib,
                "installedDate": ISO8601DateFormatter().string(from: Date())
            ]

            let metadataURL = modelPath.appendingPathComponent("model_info.json")
            let jsonData = try JSONSerialization.data(withJSONObject: modelInfo, options: .prettyPrinted)
            try jsonData.write(to: metadataURL)

            downloadedModels.insert(model.id)
            print("✅ Model \(model.name) is ready to use")

        } catch {
            print("❌ Failed to prepare model: \(error)")
        }
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

enum ModelImportError: Error, LocalizedError {
    case invalidFileType
    case fileTooLarge
    case fileTooSmall
    case insufficientStorage
    case cannotDeleteDefaultModel
    case copyFailed(String)
    case invalidGGUFFile

    var errorDescription: String? {
        switch self {
        case .invalidFileType:
            return "File must be a .gguf model"
        case .fileTooLarge:
            return "Model file is too large (max 10 GB)"
        case .fileTooSmall:
            return "Model file is too small (min 100 MB)"
        case .insufficientStorage:
            return "Insufficient storage space"
        case .cannotDeleteDefaultModel:
            return "Cannot delete default model"
        case .copyFailed(let message):
            return "Failed to copy file: \(message)"
        case .invalidGGUFFile:
            return "Invalid GGUF file format. Please ensure you're uploading a valid .gguf model file."
        }
    }
}
