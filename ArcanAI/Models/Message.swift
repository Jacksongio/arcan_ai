//
//  Message.swift
//  ArcanAI
//
//  Chat message data model
//

import Foundation

struct Message: Identifiable, Codable {
    let id: UUID
    let role: MessageRole
    var content: String  // Changed to var for streaming updates
    let timestamp: Date
    var isStreaming: Bool

    init(id: UUID = UUID(), role: MessageRole, content: String, timestamp: Date = Date(), isStreaming: Bool = false) {
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
        self.isStreaming = isStreaming
    }
}

enum MessageRole: String, Codable {
    case user
    case assistant
    case system
}
