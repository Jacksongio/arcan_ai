//
//  ContentView.swift
//  ArcanAI
//
//  Main view for ArcanAI
//

import SwiftUI

struct ContentView: View {
    @StateObject private var modelManager = ModelManager.shared
    @State private var showModelSelector = false
    @State private var navigateToChat = false
    @State private var selectedModelForChat: MLCModel?

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
                    let starSeed = Double(index) * 0.618033988749895 // Golden ratio for distribution
                    let opacity = 0.3 + (starSeed.truncatingRemainder(dividingBy: 1.0) * 0.7)
                    let size = 1.0 + ((starSeed * 7.3).truncatingRemainder(dividingBy: 1.0) * 1.5)
                    let x = (starSeed * geometry.size.width * 2.7).truncatingRemainder(dividingBy: geometry.size.width)
                    let y = ((starSeed + 0.5) * geometry.size.height * 3.1).truncatingRemainder(dividingBy: geometry.size.height)

                    Circle()
                        .fill(Color.white.opacity(opacity))
                        .frame(width: size, height: size)
                        .position(x: x, y: y)
                }
            }

            // Main content
            VStack(spacing: 24) {
                Spacer()

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

                // Downloaded models list or select button
                if !modelManager.downloadedModels.isEmpty {
                    VStack(spacing: 12) {
                        Text("Your Models")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))

                        ForEach(MLCModel.availableModels.filter { modelManager.isModelDownloaded($0.id) }) { model in
                            Button(action: {
                                selectedModelForChat = model
                                navigateToChat = true
                            }) {
                                HStack {
                                    Image(systemName: "brain.head.profile")
                                        .font(.system(size: 16))

                                    Text(model.name)
                                        .font(.system(size: 16, weight: .medium, design: .rounded))

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                }
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 14)
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(12)
                            }
                        }
                    }
                    .padding(.horizontal, 40)
                }

                // Select Model Button
                Button(action: {
                    showModelSelector = true
                }) {
                    HStack(spacing: 12) {
                        Image(systemName: modelManager.downloadedModels.isEmpty ? "cpu.fill" : "plus.circle.fill")
                            .font(.system(size: 20))
                        Text(modelManager.downloadedModels.isEmpty ? "Select Your Model" : "Download More Models")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 32)
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
                .padding(.top, 20)

                Spacer()
            }
            .navigationDestination(isPresented: $navigateToChat) {
                if let model = selectedModelForChat {
                    ChatView(model: model)
                        .navigationBarBackButtonHidden(true)
                }
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showModelSelector) {
            ModelSelectorView(onModelDownloaded: { model in
                selectedModelForChat = model
                navigateToChat = true
                showModelSelector = false
            })
        }
        }
    }
}

#Preview {
    ContentView()
}
