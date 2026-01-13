//
//  ContentView.swift
//  ArcanAI
//
//  Main view for ArcanAI
//

import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @StateObject private var modelManager = ModelManager.shared
    @State private var navigateToChat = false
    @State private var isPreparingModel = false
    @State private var selectedModel: MLCModel?
    @State private var showFileImporter = false
    @State private var isImporting = false
    @State private var importError: String?
    @State private var showErrorAlert = false

    private let defaultModel = MLCModel.defaultModel

    var body: some View {
        NavigationStack {
            ZStack {
            // Dark starry night background
            Color.black
                .ignoresSafeArea()

            // Subtle gradient overlay
            RadialGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.05, green: 0.05, blue: 0.15).opacity(0.8),
                    Color.black
                ]),
                center: .center,
                startRadius: 100,
                endRadius: 500
            )
            .ignoresSafeArea()

            // Stars
            GeometryReader { geometry in
                ForEach(0..<150, id: \.self) { index in
                    // Use multiple prime numbers for pseudo-random distribution
                    let seed1 = Double(index) * 12.9898
                    let seed2 = Double(index) * 78.233
                    let seed3 = Double(index) * 43.758

                    // Create pseudo-random values using sine functions
                    let randomX = abs(sin(seed1) * 43758.5453123).truncatingRemainder(dividingBy: 1.0)
                    let randomY = abs(sin(seed2) * 43758.5453123).truncatingRemainder(dividingBy: 1.0)
                    let randomSize = abs(sin(seed3) * 43758.5453123).truncatingRemainder(dividingBy: 1.0)
                    let randomOpacity = abs(sin(seed1 * 2.0) * 43758.5453123).truncatingRemainder(dividingBy: 1.0)

                    let opacity = 0.3 + (randomOpacity * 0.7)
                    let size = 1.0 + (randomSize * 1.5)
                    let x = randomX * geometry.size.width
                    let y = randomY * geometry.size.height

                    Circle()
                        .fill(Color.white.opacity(opacity))
                        .frame(width: size, height: size)
                        .position(x: x, y: y)
                }
            }

            // Main content
            VStack(spacing: 0) {
                // Scrollable content
                ScrollView {
                    VStack(spacing: 24) {
                        Spacer()
                            .frame(height: 20)

                        // Logo
                        if let uiImage = UIImage(named: "arcanai.png") {
                            Image(uiImage: uiImage)
                                .resizable()
                                .scaledToFit()
                                .frame(width: 120, height: 120)
                                .shadow(color: Color.blue.opacity(0.5), radius: 20, x: 0, y: 0)
                                .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
                        }

                        // Main title
                        Text("Welcome to ArcanAI!")
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .shadow(color: Color.blue.opacity(0.5), radius: 20, x: 0, y: 0)
                            .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)

                        // Subtitle
                        Text("Privately chat with AI, no internet required!")
                            .font(.system(size: 18, weight: .regular, design: .rounded))
                            .foregroundColor(.white.opacity(0.8))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                            .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 2)

                        // Model Selection Section
                        modelSelectionSection

                        Spacer()
                            .frame(height: 20)
                    }
                }

                // Fixed Start Chat Button at bottom
                Button(action: {
                    guard let model = selectedModel else { return }
                    Task {
                        isPreparingModel = true
                        await modelManager.ensureModelAvailable(model)
                        isPreparingModel = false
                        navigateToChat = true
                    }
                }) {
                    HStack(spacing: 12) {
                        if isPreparingModel {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "message.fill")
                                .font(.system(size: 20))
                        }
                        Text(isPreparingModel ? "Preparing Model..." : "Start Chat")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.blue.opacity(0.7),
                                Color.purple.opacity(0.7)
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(16)
                    .shadow(color: Color.blue.opacity(0.4), radius: 10, x: 0, y: 5)
                }
                .disabled(isPreparingModel || selectedModel == nil)
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
                .padding(.top, 12)
                .background(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.black.opacity(0.0),
                            Color.black.opacity(0.8)
                        ]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .ignoresSafeArea(edges: .bottom)
                )
            }
            .navigationDestination(isPresented: $navigateToChat) {
                if let model = selectedModel {
                    ChatView(model: model)
                        .navigationBarBackButtonHidden(true)
                }
            }
        }
        .preferredColorScheme(.dark)
        .fileImporter(
            isPresented: $showFileImporter,
            allowedContentTypes: [UTType(filenameExtension: "gguf", conformingTo: .data)!],
            allowsMultipleSelection: false
        ) { result in
            handleFileImport(result)
        }
        .alert("Import Error", isPresented: $showErrorAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(importError ?? "Unknown error")
        }
        .onAppear {
            if selectedModel == nil {
                selectedModel = defaultModel
            }
        }
        }
    }

    // MARK: - Model Selection Section
    private var modelSelectionSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Default Model
            Text("Default Model")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundColor(.white)
                .padding(.horizontal, 20)

            ModelCard(
                model: defaultModel,
                isSelected: selectedModel?.id == defaultModel.id,
                onSelect: { selectedModel = defaultModel }
            )
            .padding(.horizontal, 20)

            // Custom Models
            HStack {
                Text("Your Own Models")
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundColor(.white)

                Spacer()

                Button(action: { showFileImporter = true }) {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 16))
                        Text("Upload")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundColor(.blue)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(8)
                }
                .disabled(isImporting)
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)

            if isImporting {
                HStack(spacing: 12) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                    Text("Importing model...")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.horizontal, 20)
            }

            if modelManager.customModels.isEmpty && !isImporting {
                Text("No custom models yet. Tap Upload to add your own .gguf model files.")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .padding(.vertical, 12)
            } else {
                ForEach(modelManager.customModels) { model in
                    ModelCard(
                        model: model,
                        isSelected: selectedModel?.id == model.id,
                        onSelect: { selectedModel = model },
                        onDelete: { deleteCustomModel(model) }
                    )
                    .padding(.horizontal, 20)
                }
            }
        }
        .padding(.vertical, 16)
    }

    // MARK: - File Import Handler
    private func handleFileImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let fileURL = urls.first else { return }

            isImporting = true
            Task {
                // Start security-scoped resource access inside the async task
                let gotAccess = fileURL.startAccessingSecurityScopedResource()
                guard gotAccess else {
                    await MainActor.run {
                        importError = "Could not access selected file"
                        showErrorAlert = true
                        isImporting = false
                    }
                    return
                }

                defer { fileURL.stopAccessingSecurityScopedResource() }

                do {
                    let importedModel = try await modelManager.importCustomModel(from: fileURL)
                    await MainActor.run {
                        selectedModel = importedModel // Auto-select newly imported model
                        isImporting = false
                    }
                } catch {
                    await MainActor.run {
                        importError = error.localizedDescription
                        showErrorAlert = true
                        isImporting = false
                    }
                }
            }

        case .failure(let error):
            importError = error.localizedDescription
            showErrorAlert = true
        }
    }

    // MARK: - Delete Custom Model
    private func deleteCustomModel(_ model: MLCModel) {
        Task {
            do {
                try modelManager.deleteCustomModel(model)
                // If we deleted the selected model, switch to default
                if selectedModel?.id == model.id {
                    selectedModel = defaultModel
                }
            } catch {
                importError = error.localizedDescription
                showErrorAlert = true
            }
        }
    }
}

// MARK: - Model Card Component
struct ModelCard: View {
    let model: MLCModel
    let isSelected: Bool
    let onSelect: () -> Void
    var onDelete: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(model.name)
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundColor(.white)

                HStack(spacing: 8) {
                    Text(model.params)
                    Text("•")
                    Text(model.size)
                    Text("•")
                    Text(model.quantization)
                }
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.6))
            }

            Spacer()

            if let onDelete = onDelete {
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 14))
                        .foregroundColor(.red.opacity(0.7))
                        .padding(8)
                        .background(Color.red.opacity(0.15))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }

            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 20))
                .foregroundColor(isSelected ? .blue : .white.opacity(0.3))
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isSelected ? Color.blue.opacity(0.2) : Color.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSelected ? Color.blue : Color.white.opacity(0.2), lineWidth: isSelected ? 2 : 1)
                )
        )
        .onTapGesture(perform: onSelect)
    }
}

#Preview {
    ContentView()
}
