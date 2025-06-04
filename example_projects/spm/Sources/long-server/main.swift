import Foundation
import TestLib
import ArgumentParser

@main
struct LongServer: AsyncParsableCommand {
    static let configuration = CommandConfiguration(
        commandName: "long-server",
        abstract: "A long-running server that runs indefinitely until stopped"
    )
    
    @Option(name: .shortAndLong, help: "Port to listen on (default: 8080)")
    var port: Int = 8080
    
    @Flag(name: .shortAndLong, help: "Enable verbose logging")
    var verbose: Bool = false
    
    @Option(name: .shortAndLong, help: "Auto-shutdown after N seconds (0 = run forever)")
    var autoShutdown: Int = 0
    
    func run() async throws {
        let taskManager = TaskManager()
        
        if verbose {
            print("🚀 Starting long-running server...")
            print("🌐 Port: \(port)")
            if autoShutdown > 0 {
                print("⏰ Auto-shutdown: \(autoShutdown) seconds")
            } else {
                print("♾️  Running indefinitely (use SIGTERM to stop)")
            }
        }
        
        // Set up signal handling for graceful shutdown
        let signalSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
        signalSource.setEventHandler {
            if verbose {
                print("\n🛑 Received SIGTERM, shutting down gracefully...")
            }
            taskManager.stopServer()
        }
        signalSource.resume()
        signal(SIGTERM, SIG_IGN)
        
        await taskManager.startLongRunningServer(
            port: port, 
            verbose: verbose, 
            autoShutdown: autoShutdown
        )
    }
}