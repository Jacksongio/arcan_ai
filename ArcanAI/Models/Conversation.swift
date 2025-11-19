//
//  Conversation.swift
//  ArcanAI
//
//  Chat conversation management
//

import Foundation

struct Conversation: Identifiable, Codable {
    let id: UUID
    var messages: [Message]
    var modelId: String
    var title: String
    let createdAt: Date
    var updatedAt: Date

    init(id: UUID = UUID(), messages: [Message] = [], modelId: String, title: String = "New Chat", createdAt: Date = Date(), updatedAt: Date = Date()) {
        self.id = id
        self.messages = messages
        self.modelId = modelId
        self.title = title
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    mutating func addMessage(_ message: Message) {
        messages.append(message)
        updatedAt = Date()

        // Auto-generate title from first user message
        if title == "New Chat", message.role == .user, !message.content.isEmpty {
            title = String(message.content.prefix(50))
        }
    }
}
