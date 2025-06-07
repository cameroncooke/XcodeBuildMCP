import SwiftUI

// MARK: - Calculator Button Component
struct CalculatorButton: View {
    let title: String
    let buttonType: CalculatorButtonType
    let isWideButton: Bool
    let action: () -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        if buttonType == .hidden {
            // Empty space for layout
            Color.clear
                .frame(height: 80)
        } else {
            Button(action: {
                withAnimation(.easeInOut(duration: 0.1)) {
                    isPressed = true
                }
                action()
                
                Task {
                    try await Task.sleep(for: .seconds(0.1))
                    await MainActor.run {
                        withAnimation(.easeInOut(duration: 0.1)) {
                            isPressed = false
                        }
                    }
                }
            }) {
                ZStack {
                    // Frosted glass background
                    RoundedRectangle(cornerRadius: 20)
                        .fill(.ultraThinMaterial)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(buttonType.borderColor, lineWidth: 1)
                        )
                        .overlay(
                            // Subtle inner glow
                            RoundedRectangle(cornerRadius: 20)
                                .fill(
                                    RadialGradient(
                                        colors: [buttonType.glowColor.opacity(0.3), Color.clear],
                                        center: .topLeading,
                                        startRadius: 0,
                                        endRadius: 50
                                    )
                                )
                        )
                        .scaleEffect(isPressed ? 0.95 : 1.0)
                        .shadow(color: buttonType.shadowColor.opacity(0.3), radius: isPressed ? 2 : 8, x: 0, y: isPressed ? 1 : 4)
                    
                    // Button text
                    Text(title)
                        .font(.system(size: 32, weight: .medium, design: .rounded))
                        .foregroundColor(buttonType.textColor)
                        .scaleEffect(isPressed ? 0.9 : 1.0)
                }
            }
            .frame(height: 80)
            .gridCellColumns(isWideButton ? 2 : 1)
            .buttonStyle(PlainButtonStyle())
        }
    }
}

// MARK: - Button Type Configuration
enum CalculatorButtonType {
    case number, operation, function, hidden
    
    var textColor: Color {
        switch self {
        case .number:
            return .white
        case .operation:
            return .white
        case .function:
            return .white
        case .hidden:
            return .clear
        }
    }
    
    var borderColor: Color {
        switch self {
        case .number:
            return .white.opacity(0.3)
        case .operation:
            return .orange.opacity(0.6)
        case .function:
            return .gray.opacity(0.5)
        case .hidden:
            return .clear
        }
    }
    
    var glowColor: Color {
        switch self {
        case .number:
            return .blue
        case .operation:
            return .orange
        case .function:
            return .gray
        case .hidden:
            return .clear
        }
    }
    
    var shadowColor: Color {
        switch self {
        case .number:
            return .blue
        case .operation:
            return .orange
        case .function:
            return .gray
        case .hidden:
            return .clear
        }
    }
}