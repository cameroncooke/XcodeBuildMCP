import Foundation

// MARK: - Calculator Business Logic Service
/// Handles all calculator operations and state management
/// Separated from UI concerns for better testability and modularity
@Observable
public final class CalculatorService {
    
    // MARK: - Public Properties
    public private(set) var display: String = "0"
    public private(set) var expressionDisplay: String = ""
    public private(set) var hasError: Bool = false
    
    // MARK: - Private State
    private var currentNumber: Double = 0
    private var previousNumber: Double = 0
    private var operation: Operation?
    private var shouldResetDisplay = false
    private var isNewCalculation = true
    private var lastOperation: Operation?
    private var lastOperand: Double = 0
    
    // MARK: - Operations
    public enum Operation: String, CaseIterable, Sendable {
        case add = "+"
        case subtract = "-"
        case multiply = "×"
        case divide = "÷"
        
        public func calculate(_ a: Double, _ b: Double) -> Double {
            switch self {
            case .add: return a + b
            case .subtract: return a - b
            case .multiply: return a * b
            case .divide: return b != 0 ? a / b : 0
            }
        }
    }
    
    public init() {}
    
    // MARK: - Public Interface
    public func inputNumber(_ digit: String) {
        guard !hasError else { clear(); return }
        
        if shouldResetDisplay || isNewCalculation {
            display = digit
            shouldResetDisplay = false
            isNewCalculation = false
        } else if display.count < 12 {
            display = display == "0" ? digit : display + digit
        }
        
        currentNumber = Double(display) ?? 0
        updateExpressionDisplay()
    }
    
    public func inputDecimal() {
        guard !hasError else { clear(); return }
        
        if shouldResetDisplay || isNewCalculation {
            display = "0."
            shouldResetDisplay = false
            isNewCalculation = false
        } else if !display.contains(".") && display.count < 11 {
            display += "."
        }
        updateExpressionDisplay()
    }
    
    public func setOperation(_ op: Operation) {
        guard !hasError else { return }
        
        if operation != nil && !shouldResetDisplay {
            calculate()
            if hasError { return }
        }
        
        previousNumber = currentNumber
        operation = op
        shouldResetDisplay = true
        isNewCalculation = false
        updateExpressionDisplay()
    }
    
    public func calculate() {
        guard let op = operation ?? lastOperation else { return }
        let operand = (operation != nil) ? currentNumber : lastOperand
        
        let result = op.calculate(previousNumber, operand)
        
        // Error handling
        if result.isNaN || result.isInfinite {
            setError("Cannot divide by zero")
            return
        }
        
        if abs(result) > 1e12 {
            setError("Number too large")
            return
        }
        
        // Success path
        let prevFormatted = formatNumber(previousNumber)
        let currFormatted = formatNumber(operand)
        display = formatNumber(result)
        expressionDisplay = "\(prevFormatted) \(op.rawValue) \(currFormatted) ="
        
        previousNumber = result
        if operation != nil {
            lastOperand = currentNumber
        }
        
        lastOperation = op
        operation = nil
        currentNumber = result
        shouldResetDisplay = true
        isNewCalculation = false
    }
    
    public func toggleSign() {
        guard !hasError && currentNumber != 0 else { return }
        currentNumber *= -1
        display = formatNumber(currentNumber)
        updateExpressionDisplay()
    }
    
    public func percentage() {
        guard !hasError else { return }
        currentNumber /= 100
        display = formatNumber(currentNumber)
        updateExpressionDisplay()
    }
    
    public func clear() {
        display = "0"
        expressionDisplay = ""
        currentNumber = 0
        previousNumber = 0
        operation = nil
        shouldResetDisplay = false
        hasError = false
        isNewCalculation = true
    }
    
    // MARK: - Private Helpers
    private func setError(_ message: String) {
        hasError = true
        display = "Error"
        expressionDisplay = message
    }
    
    private func updateExpressionDisplay() {
        guard !hasError else { return }
        
        if let op = operation {
            let prevFormatted = formatNumber(previousNumber)
            expressionDisplay = "\(prevFormatted) \(op.rawValue)"
        } else if isNewCalculation {
            expressionDisplay = ""
        }
    }
    
    private func formatNumber(_ number: Double) -> String {
        guard !number.isNaN && !number.isInfinite else { return "Error" }
        
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 8
        formatter.minimumFractionDigits = 0
        
        // For integers, don't show decimal places
        if number == floor(number) && abs(number) < 1e10 {
            formatter.maximumFractionDigits = 0
        }
        
        // For very small decimals, use scientific notation
        if abs(number) < 0.000001 && number != 0 {
            formatter.numberStyle = .scientific
            formatter.maximumFractionDigits = 2
        }
        
        return formatter.string(from: NSNumber(value: number)) ?? "0"
    }
}

// MARK: - Testing Support
extension CalculatorService {
    public var currentValue: Double { currentNumber }
    public var previousValue: Double { previousNumber }
    public var currentOperation: Operation? { operation }
    public var willResetDisplay: Bool { shouldResetDisplay }
}