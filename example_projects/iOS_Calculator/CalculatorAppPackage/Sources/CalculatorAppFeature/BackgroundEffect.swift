import SwiftUI

// MARK: - Background State Management
enum BackgroundState {
    case normal, calculated, error
    
    var colors: [Color] {
        switch self {
        case .normal:
            return [Color.blue.opacity(0.8), Color.purple.opacity(0.8), Color.indigo.opacity(0.9)]
        case .calculated:
            return [Color.green.opacity(0.7), Color.mint.opacity(0.8), Color.teal.opacity(0.9)]
        case .error:
            return [Color.red.opacity(0.7), Color.pink.opacity(0.8), Color.orange.opacity(0.9)]
        }
    }
}

// MARK: - Animated Background Component
struct AnimatedBackground: View {
    let backgroundGradient: BackgroundState
    
    var body: some View {
        AngularGradient(
            colors: backgroundGradient.colors,
            center: .topLeading,
            angle: .degrees(45)
        )
        .ignoresSafeArea()
        .animation(.easeInOut(duration: 0.8), value: backgroundGradient)
    }
}