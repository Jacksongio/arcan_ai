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
    @State private var showFileImporter = false
    @State private var isImporting = false
    @State private var importError: String?
    @State private var showErrorAlert = false

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
            VStack(spacing: 40) {
                Spacer()

                // Logo
                if let uiImage = UIImage(named: "arcanai.png") {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 140, height: 140)
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

                Spacer()

                // Start Chat Button
                Button(action: {
                    navigateToChat = true
                }) {
                    HStack(spacing: 12) {
                        Image(systemName: "message.fill")
                            .font(.system(size: 20))
                        Text("Start Chat")
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
                .padding(.horizontal, 20)
                .padding(.bottom, 40)

                // Upload Model Button (subtle)
                Button(action: { showFileImporter = true }) {
                    HStack(spacing: 8) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 14))
                        Text("Upload Custom Model")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundColor(.white.opacity(0.6))
                }
                .padding(.bottom, 20)
                .disabled(isImporting)
            }
            .navigationDestination(isPresented: $navigateToChat) {
                ChatView()
                    .navigationBarBackButtonHidden(true)
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
        }
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
                    _ = try await modelManager.importCustomModel(from: fileURL)
                    await MainActor.run {
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
}

#Preview {
    ContentView()
}
