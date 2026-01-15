//
//  VoiceMode.swift
//  ArcanAI
//
//  Full-screen voice conversation mode
//

import SwiftUI
import Speech
import AVFoundation

struct VoiceMode: View {
    @StateObject private var voiceManager = VoiceManager()
    @StateObject private var chatEngine = ChatEngine()
    @Environment(\.dismiss) var dismiss

    @State private var conversationHistory: [Message] = []
    @State private var currentTranscript = ""
    @State private var isProcessing = false  // Shows stop button during thinking/speaking

    var body: some View {
        ZStack {
            // Dark background
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                    }

                    Spacer()

                    Text("Voice Mode")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))

                    Spacer()

                    // Placeholder for symmetry
                    Color.clear.frame(width: 44, height: 44)
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)

                Spacer()

                // Status text
                VStack(spacing: 12) {
                    if voiceManager.isListening {
                        Text(currentTranscript.isEmpty ? "Listening..." : currentTranscript)
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    } else if voiceManager.isSpeaking {
                        Text(voiceManager.currentlySpeakingText)
                            .font(.system(size: 20))
                            .foregroundColor(.white.opacity(0.9))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    } else if isProcessing {
                        Text("Thinking...")
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                    } else {
                        Text("Tap to speak")
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
                .frame(height: 200)

                // Audio visualization
                AudioWaveformView(
                    isListening: voiceManager.isListening,
                    isSpeaking: voiceManager.isSpeaking,
                    audioLevel: voiceManager.audioLevel
                )
                .frame(height: 200)

                Spacer()

                // Main control button
                Button(action: handleMainButtonTap) {
                    ZStack {
                        Circle()
                            .fill(
                                voiceManager.isListening ? Color.blue :
                                isProcessing || voiceManager.isSpeaking ? Color.red :
                                Color.blue
                            )
                            .frame(width: 80, height: 80)
                            .shadow(color: isProcessing || voiceManager.isSpeaking ? .red.opacity(0.5) : .blue.opacity(0.5), radius: 20)

                        if voiceManager.isListening {
                            // Submit arrow when listening
                            Image(systemName: "arrow.up")
                                .font(.system(size: 32, weight: .bold))
                                .foregroundColor(.white)
                        } else if isProcessing || voiceManager.isSpeaking {
                            // Stop button when processing or speaking
                            Image(systemName: "stop.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.white)
                        } else {
                            // Mic when idle
                            Image(systemName: "mic.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.white)
                        }
                    }
                }
                .padding(.bottom, 60)
            }
        }
        .preferredColorScheme(.dark)
        .task {
            await loadModel()
            await requestPermissions()
        }
        .onChange(of: voiceManager.recognizedText) { oldValue, newValue in
            if !newValue.isEmpty && newValue != oldValue {
                currentTranscript = newValue
            }
        }
        .onChange(of: voiceManager.didFinishSpeaking) { _, finished in
            if finished {
                sendTranscribedMessage()
            }
        }
        .onChange(of: voiceManager.isSpeaking) { _, isSpeaking in
            // Reset processing state when speaking finishes
            if !isSpeaking && isProcessing {
                isProcessing = false
            }
        }
    }

    private func handleMainButtonTap() {
        if voiceManager.isListening {
            // Submit - stop listening and immediately show processing state
            voiceManager.stopListening()
            isProcessing = true
        } else if isProcessing || voiceManager.isSpeaking {
            // Stop processing/speaking
            voiceManager.stopSpeaking()
            isProcessing = false
        } else {
            // Start listening
            currentTranscript = ""
            voiceManager.startListening()
        }
    }

    private func loadModel() async {
        do {
            try Task.checkCancellation()
            // Always use the built-in Gemma model for voice mode
            try await chatEngine.loadModel(MLCModel.defaultModel)
        } catch is CancellationError {
            // Task was cancelled (e.g., view dismissed), don't log error
        } catch {
            print("Error loading model: \(error)")
        }
    }

    private func requestPermissions() async {
        await voiceManager.requestPermissions()
    }

    private func sendTranscribedMessage() {
        guard !currentTranscript.isEmpty else {
            isProcessing = false
            return
        }

        let userMessage = currentTranscript
        currentTranscript = ""
        // isProcessing is already true from handleMainButtonTap

        // Add user message to history
        let message = Message(role: .user, content: userMessage)
        conversationHistory.append(message)

        Task {
            do {
                let stream = try await chatEngine.sendMessage(
                    userMessage,
                    conversationHistory: conversationHistory
                )

                var fullResponse = ""

                for await token in stream {
                    fullResponse += token
                }

                // Add assistant response to history
                let assistantMessage = Message(role: .assistant, content: fullResponse)
                conversationHistory.append(assistantMessage)

                // Speak the response (isProcessing stays true while speaking)
                voiceManager.speak(fullResponse)

            } catch {
                print("Error during inference: \(error)")
                isProcessing = false
            }
        }
    }
}

// MARK: - Audio Waveform Visualization
struct AudioWaveformView: View {
    let isListening: Bool
    let isSpeaking: Bool
    let audioLevel: CGFloat

    @State private var animationPhase: CGFloat = 0

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 8) {
                ForEach(0..<5, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 4)
                        .fill(isListening || isSpeaking ? Color.blue : Color.white.opacity(0.2))
                        .frame(
                            width: 8,
                            height: barHeight(for: index, in: geometry)
                        )
                        .animation(
                            .easeInOut(duration: 0.5)
                            .repeatForever(autoreverses: true)
                            .delay(Double(index) * 0.1),
                            value: animationPhase
                        )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .onAppear {
            animationPhase = 1
        }
    }

    private func barHeight(for index: Int, in geometry: GeometryProxy) -> CGFloat {
        let baseHeight: CGFloat = 20
        let maxHeight = geometry.size.height * 0.6

        if isListening || isSpeaking {
            let variation = sin(animationPhase * .pi + Double(index) * 0.5) * 0.5 + 0.5
            return baseHeight + (maxHeight - baseHeight) * CGFloat(variation) * audioLevel
        }

        return baseHeight
    }
}

// MARK: - Voice Manager
@MainActor
class VoiceManager: NSObject, ObservableObject {
    @Published var isListening = false
    @Published var isSpeaking = false
    @Published var recognizedText = ""
    @Published var didFinishSpeaking = false
    @Published var audioLevel: CGFloat = 0.5
    @Published var currentlySpeakingText = ""

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()

    private var speechSynthesizer = AVSpeechSynthesizer()

    override init() {
        super.init()
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        speechSynthesizer.delegate = self
    }

    func requestPermissions() async {
        // Request speech recognition permission
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                print("Speech recognition permission: \(status.rawValue)")
                continuation.resume()
            }
        }

        // Request microphone permission
        #if os(iOS)
        let micStatus: Bool = await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
        print("Microphone permission: \(micStatus)")
        #endif
    }

    func startListening() {
        guard !audioEngine.isRunning else { return }

        do {
            try startRecording()
            isListening = true
            recognizedText = ""
            didFinishSpeaking = false
        } catch {
            print("Error starting recording: \(error)")
        }
    }

    func stopListening() {
        audioEngine.stop()
        recognitionRequest?.endAudio()
        isListening = false
        didFinishSpeaking = true
    }

    private func startRecording() throws {
        // Cancel any ongoing recognition
        recognitionTask?.cancel()
        recognitionTask = nil

        // Configure audio session
        #if os(iOS)
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        #endif

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()

        guard let recognitionRequest = recognitionRequest else {
            throw NSError(domain: "VoiceManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unable to create recognition request"])
        }

        recognitionRequest.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            if let result = result {
                Task { @MainActor in
                    self.recognizedText = result.bestTranscription.formattedString
                }
            }

            if error != nil || result?.isFinal == true {
                self.audioEngine.stop()
                inputNode.removeTap(onBus: 0)
                self.recognitionRequest = nil
                self.recognitionTask = nil
            }
        }

        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)

            // Calculate audio level for visualization
            let channelData = buffer.floatChannelData?[0]
            let frames = buffer.frameLength
            var sum: Float = 0
            if let data = channelData {
                for i in 0..<Int(frames) {
                    sum += abs(data[i])
                }
            }
            let average = sum / Float(frames)

            Task { @MainActor in
                self.audioLevel = min(CGFloat(average * 10), 1.0)
            }
        }

        audioEngine.prepare()
        try audioEngine.start()
    }

    func speak(_ text: String) {
        // Stop any ongoing speech
        if speechSynthesizer.isSpeaking {
            speechSynthesizer.stopSpeaking(at: .immediate)
        }

        currentlySpeakingText = text
        isSpeaking = true

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = 0.5
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0

        speechSynthesizer.speak(utterance)
    }

    func stopSpeaking() {
        speechSynthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
        currentlySpeakingText = ""
    }
}

// MARK: - Speech Synthesizer Delegate
extension VoiceManager: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.isSpeaking = false
            self.currentlySpeakingText = ""
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.isSpeaking = false
            self.currentlySpeakingText = ""
        }
    }
}
