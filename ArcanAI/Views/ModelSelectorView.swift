//
//  ModelSelectorView.swift
//  ArcanAI
//
//  Model selection sheet
//

import SwiftUI

struct ModelSelectorView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var modelManager = ModelManager.shared
    @State private var selectedModel: MLCModel?
    @State private var isDownloading = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""

    let models = MLCModel.availableModels
    var onModelDownloaded: ((MLCModel) -> Void)? = nil

    var body: some View {
        ZStack {
            // Background
            Color.black.ignoresSafeArea()

            // Gradient overlay
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

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.7))
                    }

                    Spacer()

                    Text("Select Model")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundColor(.white)

                    Spacer()

                    // Invisible spacer for balance
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 28))
                        .opacity(0)
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 24)

                // Model list
                ScrollView {
                    VStack(spacing: 16) {
                        ForEach(models) { model in
                            ModelCard(
                                model: model,
                                isSelected: selectedModel?.id == model.id,
                                isDownloaded: modelManager.isModelDownloaded(model.id),
                                isDownloading: modelManager.isModelDownloading(model.id),
                                downloadProgress: modelManager.getDownloadProgress(for: model.id),
                                onSelect: {
                                    selectedModel = model
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 100)
                }

                Spacer()
            }

            // Bottom button
            VStack {
                Spacer()

                Button(action: {
                    Task {
                        if let model = selectedModel {
                            isDownloading = true
                            do {
                                try await modelManager.downloadModel(model)
                                // Success - call callback or dismiss
                                if let callback = onModelDownloaded {
                                    callback(model)
                                }
                            } catch {
                                errorMessage = error.localizedDescription
                                showErrorAlert = true
                            }
                            isDownloading = false
                        }
                    }
                }) {
                    HStack(spacing: 12) {
                        if isDownloading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: modelManager.isModelDownloaded(selectedModel?.id ?? "") ? "checkmark.circle.fill" : "arrow.down.circle.fill")
                                .font(.system(size: 20))
                        }
                        Text(modelManager.isModelDownloaded(selectedModel?.id ?? "") ? "Model Downloaded" : (isDownloading ? "Downloading..." : "Download Selected Model"))
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        selectedModel != nil && !modelManager.isModelDownloaded(selectedModel?.id ?? "") ?
                        LinearGradient(
                            gradient: Gradient(colors: [Color.blue, Color.purple]),
                            startPoint: .leading,
                            endPoint: .trailing
                        ) :
                        LinearGradient(
                            gradient: Gradient(colors: [Color.gray.opacity(0.4), Color.gray.opacity(0.4)]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(16)
                    .shadow(color: selectedModel != nil ? Color.blue.opacity(0.4) : Color.clear, radius: 10, x: 0, y: 5)
                }
                .disabled(selectedModel == nil || isDownloading || modelManager.isModelDownloaded(selectedModel?.id ?? ""))
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
            }
        }
        .preferredColorScheme(.dark)
        .alert("Download Error", isPresented: $showErrorAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
    }
}

struct ModelCard: View {
    let model: MLCModel
    let isSelected: Bool
    let isDownloaded: Bool
    let isDownloading: Bool
    let downloadProgress: Double
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text(model.name)
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                                .foregroundColor(.white)

                            if isDownloaded {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(.green)
                            }
                        }

                        HStack(spacing: 12) {
                            HStack(spacing: 4) {
                                Image(systemName: "cpu")
                                    .font(.system(size: 12))
                                Text(model.params)
                                    .font(.system(size: 14, weight: .medium))
                            }

                            HStack(spacing: 4) {
                                Image(systemName: "internaldrive")
                                    .font(.system(size: 12))
                                Text(model.size)
                                    .font(.system(size: 14, weight: .medium))
                            }
                        }
                        .foregroundColor(.white.opacity(0.7))
                    }

                    Spacer()

                    // Selection indicator
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 28))
                        .foregroundColor(isSelected ? .blue : .white.opacity(0.3))
                }

                Text(model.description)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(2)

                // Download progress bar
                if isDownloading {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("Downloading...")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.blue)
                            Spacer()
                            Text("\(Int(downloadProgress * 100))%")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.blue)
                        }

                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.white.opacity(0.2))
                                    .frame(height: 6)

                                RoundedRectangle(cornerRadius: 4)
                                    .fill(
                                        LinearGradient(
                                            gradient: Gradient(colors: [.blue, .purple]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geometry.size.width * downloadProgress, height: 6)
                            }
                        }
                        .frame(height: 6)
                    }
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(isSelected ? 0.15 : 0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(
                                isSelected ?
                                LinearGradient(
                                    gradient: Gradient(colors: [.blue, .purple]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ) :
                                LinearGradient(
                                    gradient: Gradient(colors: [.clear, .clear]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 2
                            )
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    ModelSelectorView()
}
