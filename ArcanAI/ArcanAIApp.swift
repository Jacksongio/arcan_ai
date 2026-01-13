//
//  ArcanAIApp.swift
//  ArcanAI
//
//  Private, offline, on-device LLM for iOS
//

import SwiftUI
import UIKit

// AppDelegate to handle memory warnings
class AppDelegate: NSObject, UIApplicationDelegate {
    func applicationDidReceiveMemoryWarning(_ application: UIApplication) {
        print("⚠️ Memory warning received - clearing caches")
        // Post notification for ChatEngine to handle
        NotificationCenter.default.post(name: UIApplication.didReceiveMemoryWarningNotification, object: nil)
    }
}

@main
struct ArcanAIApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
