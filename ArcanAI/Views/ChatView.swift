//
//  ChatView.swift
//  ArcanAI
//
//  Chat interface with message bubbles
//

import SwiftUI

struct ChatView: View {
    let model: MLCModel

    @StateObject private var chatEngine = ChatEngine()
    @State private var conversation = Conversation(messages: [], modelId: "")
    @State private var messageText = ""
    @State private var isGenerating = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""
    @State private var generationTask: Task<Void, Never>?
    @Environment(\.dismiss) var dismiss

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

            VStack(spacing: 2) {
                Text(model.name)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                HStack(spacing: 4) {
                    Circle()
                        .fill(chatEngine.isModelLoaded ? Color.green : Color.gray)
                        .frame(width: 6, height: 6)

                    Text(chatEngine.isModelLoaded ? "Ready" : "Loading...")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.7))
                }
            }

            Spacer()

            Button(action: {
                // Clear conversation
                conversation.messages.removeAll()
            }) {
                Image(systemName: "trash")
                    .font(.system(size: 18))
                    .foregroundColor(.white.opacity(0.7))
            }
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
        do {
            try await chatEngine.loadModel(model)
            conversation.modelId = model.id
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
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

                // Mark streaming as complete
                if let lastIndex = conversation.messages.indices.last {
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

    var body: some View {
        HStack {
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

                            Text("Generating...")
                                .font(.system(size: 16))
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(LinearGradient(
                                    gradient: Gradient(colors: [Color.white.opacity(0.15), Color.white.opacity(0.15)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ))
                        )
                    } else {
                        MarkdownText(message.content)
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .padding(12)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(LinearGradient(
                                        gradient: Gradient(colors: [Color.white.opacity(0.15), Color.white.opacity(0.15)]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ))
                            )
                    }
                } else {
                    Text(message.content)
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(LinearGradient(
                                    gradient: Gradient(colors: [Color.blue, Color.purple]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ))
                        )
                }
            }
            .frame(maxWidth: 280, alignment: message.role == .user ? .trailing : .leading)

            if message.role == .assistant {
                Spacer()
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

#Preview {
    ChatView(model: MLCModel.availableModels[0])
}
