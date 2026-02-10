//
//  ContentView.swift
//  MCPTest
//
//  Created by Cameron on 16/02/2025.
//

import SwiftUI
import OSLog

struct ContentView: View {
    @State private var text: String = ""

    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            TextField("Enter text", text: $text)
                #if !os(watchOS) && !os(tvOS)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                #endif
                .padding(.horizontal)
            Text(text)

            Button("Log something") {
                let message = ProcessInfo.processInfo.environment.map { "\($0.key): \($0.value)" }.joined(separator: "\n")
                Logger.myApp.debug("Environment: \(message)")                
                debugPrint("Button was pressed.")

                text = "You just pressed the button!"
            }
        }
        .padding()
    }
}

#Preview {
    ContentView()
}

// OS Log Extension
extension Logger {
    static let myApp = Logger(
        subsystem: "io.sentry.MCPTest", 
        category: "default"
    )
}
    
