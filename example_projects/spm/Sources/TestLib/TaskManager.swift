import Foundation

public class TaskManager {
    private var isServerRunning = false
    
    public init() {}
    
    public func executeQuickTask(name: String, duration: Int, verbose: Bool) async {
        if verbose {
            print("📝 Task '\(name)' started at \(Date())")
        }
        
        // Simulate work with periodic output using Swift Concurrency
        for i in 1...duration {
            if verbose {
                print("⚙️  Working... step \(i)/\(duration)")
            }
            try? await Task.sleep(for: .seconds(1))
        }
        
        if verbose {
            print("🎉 Task '\(name)' completed at \(Date())")
        } else {
            print("Task '\(name)' completed in \(duration)s")
        }
    }
    
    public func startLongRunningServer(port: Int, verbose: Bool, autoShutdown: Int) async {
        if verbose {
            print("🔧 Initializing server on port \(port)...")
        }
        
        var secondsRunning = 0
        let startTime = Date()
        isServerRunning = true
        
        // Simulate server startup
        try? await Task.sleep(for: .milliseconds(500))
        print("✅ Server running on port \(port)")
        
        // Main server loop using Swift Concurrency
        while isServerRunning {
            try? await Task.sleep(for: .seconds(1))
            secondsRunning += 1
            
            if verbose && secondsRunning % 5 == 0 {
                print("📊 Server heartbeat: \(secondsRunning)s uptime")
            }
            
            // Handle auto-shutdown
            if autoShutdown > 0 && secondsRunning >= autoShutdown {
                if verbose {
                    print("⏰ Auto-shutdown triggered after \(autoShutdown)s")
                }
                break
            }
        }
        
        let uptime = Date().timeIntervalSince(startTime)
        print("🛑 Server stopped after \(String(format: "%.1f", uptime))s uptime")
        isServerRunning = false
    }
    
    public func stopServer() {
        isServerRunning = false
    }
    
    public func calculateSum(_ a: Int, _ b: Int) -> Int {
        return a + b
    }
    
    public func validateInput(_ input: String) -> Bool {
        return !input.isEmpty && input.count <= 100
    }
}