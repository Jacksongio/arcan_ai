//
//  ChatView.swift
//  ArcanAI
//
//  Chat interface with message bubbles
//

import SwiftUI

struct ChatView: View {
    @StateObject private var chatEngine = ChatEngine()
    @StateObject private var modelManager = ModelManager.shared
    @State private var selectedModel: MLCModel = MLCModel.defaultModel
    @State private var conversation = Conversation(messages: [], modelId: "")
    @State private var messageText = ""
    @State private var isGenerating = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""
    @State private var generationTask: Task<Void, Never>?
    @State private var showDeleteConfirmation = false
    @State private var isLoadingModel = false
    @State private var showManageModels = false
    @State private var showVoiceMode = false
    @Environment(\.dismiss) var dismiss

    private var availableModels: [MLCModel] {
        [MLCModel.defaultModel] + modelManager.customModels
    }

    var body: some View {
        ZStack {
            // Dark background
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

            VStack(spacing: 0) {
                // Header
                chatHeader

                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(spacing: 16) {
                            if conversation.messages.isEmpty {
                                emptyStateView
                            } else {
                                ForEach(conversation.messages) { message in
                                    MessageBubble(message: message)
                                        .id(message.id)
                                }
                            }
                        }
                        .padding(16)
                    }
                    .onChange(of: conversation.messages.count) { _, _ in
                        // Scroll when new messages are added
                        scrollToBottom(proxy: proxy)
                    }
                    .onChange(of: conversation.messages.last?.content) { _, _ in
                        // Scroll during streaming (content updates)
                        scrollToBottom(proxy: proxy, animated: false)
                    }
                }

                // Input area
                messageInputView
            }
        }
        .preferredColorScheme(.dark)
        .task {
            await loadModel()
        }
        .alert("Error", isPresented: $showErrorAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
        .sheet(isPresented: $showManageModels) {
            ManageModelsView(
                models: modelManager.customModels,
                currentModelId: selectedModel.id,
                onDelete: { model in
                    deleteModel(model)
                }
            )
        }
        .fullScreenCover(isPresented: $showVoiceMode) {
            VoiceMode(model: selectedModel)
        }
    }

    // MARK: - Header
    private var chatHeader: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
            }

            Spacer()

            // Model Picker Dropdown
            Menu {
                ForEach(availableModels) { model in
                    Button(action: {
                        if model.id != selectedModel.id {
                            switchModel(to: model)
                        }
                    }) {
                        HStack {
                            Text(model.name)
                            if model.id == selectedModel.id {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }

                if !modelManager.customModels.isEmpty {
                    Divider()

                    Button(action: {
                        showManageModels = true
                    }) {
                        HStack {
                            Image(systemName: "slider.horizontal.3")
                            Text("Manage Models")
                        }
                    }
                }
            } label: {
                VStack(spacing: 2) {
                    HStack(spacing: 4) {
                        Text(selectedModel.name)
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .lineLimit(1)

                        Image(systemName: "chevron.down")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.6))
                    }

                    HStack(spacing: 4) {
                        Circle()
                            .fill(chatEngine.isModelLoaded && !isLoadingModel ? Color.green : Color.gray)
                            .frame(width: 6, height: 6)

                        Text(isLoadingModel ? "Loading..." : (chatEngine.isModelLoaded ? "Ready" : "Loading..."))
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
            }
            .disabled(isGenerating || isLoadingModel)

            Spacer()

            // Voice Mode Button
            Button(action: {
                showVoiceMode = true
            }) {
                Image(systemName: "waveform")
                    .font(.system(size: 18))
                    .foregroundColor(.white.opacity(0.7))
            }
            .disabled(isGenerating || isLoadingModel || !chatEngine.isModelLoaded)

            Button(action: {
                if showDeleteConfirmation {
                    // Second click - actually delete
                    conversation.messages.removeAll()
                    showDeleteConfirmation = false
                    // Clear KV cache when starting fresh conversation
                    Task {
                        await chatEngine.clearKVCache()
                        print("🗑️ Conversation cleared - KV cache reset")
                    }
                } else {
                    // First click - show confirmation
                    showDeleteConfirmation = true
                    // Reset confirmation after 3 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        showDeleteConfirmation = false
                    }
                }
            }) {
                Image(systemName: showDeleteConfirmation ? "exclamationmark.triangle.fill" : "trash")
                    .font(.system(size: 18))
                    .foregroundColor(showDeleteConfirmation ? .red : .white.opacity(0.7))
            }
            .disabled(isGenerating || isLoadingModel)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(Color.white.opacity(0.05))
    }

    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "message.fill")
                .font(.system(size: 60))
                .foregroundColor(.white.opacity(0.3))

            Text("Start a conversation")
                .font(.system(size: 20, weight: .semibold, design: .rounded))
                .foregroundColor(.white.opacity(0.7))

            Text("Ask me anything! I'm running 100% on your device.")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.5))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Spacer()
        }
    }

    // MARK: - Input View
    private var messageInputView: some View {
        HStack(spacing: 12) {
            // Text field with Enter key support
            TextField("Message", text: $messageText, axis: .vertical)
                .textFieldStyle(.plain)
                .padding(12)
                .background(Color.white.opacity(0.1))
                .cornerRadius(20)
                .foregroundColor(.white)
                .lineLimit(1...5)
                .disabled(isGenerating || !chatEngine.isModelLoaded)
                .onSubmit {
                    if !isGenerating && !messageText.trimmingCharacters(in: .whitespaces).isEmpty {
                        sendMessage()
                    }
                }
                .submitLabel(.send)

            // Send/Stop button
            Button(action: {
                if isGenerating {
                    stopGeneration()
                } else {
                    sendMessage()
                }
            }) {
                Image(systemName: isGenerating ? "stop.circle.fill" : "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(messageText.isEmpty && !isGenerating ? .gray : .blue)
            }
            .disabled(messageText.isEmpty && !isGenerating)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.05))
    }

    // MARK: - Functions
    private func scrollToBottom(proxy: ScrollViewProxy, animated: Bool = true) {
        if let lastMessage = conversation.messages.last {
            if animated {
                withAnimation(.easeOut(duration: 0.3)) {
                    proxy.scrollTo(lastMessage.id, anchor: .bottom)
                }
            } else {
                proxy.scrollTo(lastMessage.id, anchor: .bottom)
            }
        }
    }

    private func loadModel() async {
        isLoadingModel = true
        do {
            await modelManager.ensureModelAvailable(selectedModel)
            try await chatEngine.loadModel(selectedModel)
            conversation.modelId = selectedModel.id
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
        isLoadingModel = false
    }

    private func switchModel(to model: MLCModel) {
        // Stop any ongoing generation
        if isGenerating {
            generationTask?.cancel()
            generationTask = nil
            isGenerating = false
        }

        // Clear conversation when switching models
        conversation.messages.removeAll()
        selectedModel = model

        // Load the new model
        Task {
            await loadModel()
        }
    }

    private func deleteModel(_ model: MLCModel) {
        Task {
            do {
                try modelManager.deleteCustomModel(model)

                // If we deleted the currently selected model, switch to default
                if selectedModel.id == model.id {
                    switchModel(to: MLCModel.defaultModel)
                }
            } catch {
                errorMessage = error.localizedDescription
                showErrorAlert = true
            }
        }
    }

    private func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        let userMessage = Message(role: .user, content: messageText)
        conversation.addMessage(userMessage)

        let userMessageText = messageText
        messageText = ""
        isGenerating = true

        // Create placeholder for assistant response
        var assistantMessage = Message(role: .assistant, content: "", isStreaming: true)
        conversation.addMessage(assistantMessage)

        generationTask = Task {
            do {
                let stream = try await chatEngine.sendMessage(
                    userMessageText,
                    conversationHistory: conversation.messages.filter { !$0.isStreaming }
                )

                var fullResponse = ""

                for await token in stream {
                    // Check if task was cancelled
                    if Task.isCancelled {
                        break
                    }

                    fullResponse += token

                    // Update the last message (assistant's response)
                    if let lastIndex = conversation.messages.indices.last {
                        conversation.messages[lastIndex].content = fullResponse
                    }
                }

                // Mark streaming as complete and trim trailing whitespace
                if let lastIndex = conversation.messages.indices.last {
                    conversation.messages[lastIndex].content = fullResponse.trimmingCharacters(in: .whitespacesAndNewlines)
                    conversation.messages[lastIndex].isStreaming = false
                }

                isGenerating = false
                generationTask = nil

            } catch {
                errorMessage = error.localizedDescription
                showErrorAlert = true
                isGenerating = false
                generationTask = nil

                // Remove failed message
                if conversation.messages.last?.isStreaming == true {
                    conversation.messages.removeLast()
                }
            }
        }
    }

    private func stopGeneration() {
        // Cancel the Swift task
        generationTask?.cancel()
        generationTask = nil
        isGenerating = false

        // Stop the llama.cpp inference immediately
        Task {
            await chatEngine.stopGeneration()
        }

        // Mark the last message as complete (not streaming)
        if let lastIndex = conversation.messages.indices.last,
           conversation.messages[lastIndex].isStreaming {
            conversation.messages[lastIndex].isStreaming = false
        }
    }
}

// MARK: - Message Bubble
struct MessageBubble: View {
    let message: Message
    @State private var showCopiedFeedback = false

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if message.role == .user {
                Spacer()
            }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                // Use AttributedString for markdown rendering
                if message.role == .assistant {
                    // Show loading state if streaming and no content yet
                    if message.isStreaming && message.content.isEmpty {
                        HStack(spacing: 8) {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white.opacity(0.7)))
                                .scaleEffect(0.8)

                            Text("Thinking...")
                                .font(.system(size: 16))
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .padding(12)
                    } else {
                        MarkdownText(message.content)
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .padding(.vertical, 4)
                            .contextMenu {
                                Button(action: {
                                    copyToClipboard(message.content)
                                }) {
                                    Label("Copy", systemImage: "doc.on.doc")
                                }
                            }
                    }
                } else {
                    Text(message.content)
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.15))
                        )
                        .contextMenu {
                            Button(action: {
                                copyToClipboard(message.content)
                            }) {
                                Label("Copy", systemImage: "doc.on.doc")
                            }
                        }
                }

                // Show feedback overlay when copied
                if showCopiedFeedback {
                    Text("Copied!")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.8))
                        .cornerRadius(6)
                        .transition(.opacity)
                }
            }
            .frame(maxWidth: 280, alignment: message.role == .user ? .trailing : .leading)

            if message.role == .assistant {
                Spacer()
            }
        }
    }

    private func copyToClipboard(_ text: String) {
        #if os(iOS)
        UIPasteboard.general.string = text
        #elseif os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #endif

        // Show feedback
        withAnimation {
            showCopiedFeedback = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            withAnimation {
                showCopiedFeedback = false
            }
        }
    }
}

// MARK: - Markdown Text View
struct MarkdownText: View {
    let content: String

    init(_ content: String) {
        self.content = content
    }

    var body: some View {
        if let attributedString = try? AttributedString(markdown: content, options: AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)) {
            Text(attributedString)
                .textSelection(.enabled)
        } else {
            // Fallback if markdown parsing fails
            Text(content)
                .textSelection(.enabled)
        }
    }
}

// MARK: - Manage Models View
struct ManageModelsView: View {
    let models: [MLCModel]
    let currentModelId: String
    let onDelete: (MLCModel) -> Void
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if models.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "cube.box")
                            .font(.system(size: 60))
                            .foregroundColor(.white.opacity(0.3))

                        Text("No custom models")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))

                        Text("Upload models from the main screen")
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.5))
                    }
                } else {
                    List {
                        ForEach(models) { model in
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(model.name)
                                        .font(.system(size: 16, weight: .semibold))
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

                                if model.id == currentModelId {
                                    Text("Active")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.green)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.green.opacity(0.2))
                                        .cornerRadius(6)
                                }
                            }
                            .listRowBackground(Color.white.opacity(0.05))
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    onDelete(model)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Manage Models")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.blue)
                }
            }
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.black, for: .navigationBar)
            .preferredColorScheme(.dark)
        }
    }
}

#Preview {
    ChatView()
}
