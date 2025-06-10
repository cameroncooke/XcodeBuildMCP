import Foundation

// MARK: - Input Handling
/// Handles input parsing and routing to the calculator service
struct CalculatorInputHandler {
    private let service: CalculatorService
    
    init(service: CalculatorService) {
        self.service = service
    }
    
    func handleInput(_ input: String) {
        switch input {
        case "C":
            service.clear()
        case "±":
            service.toggleSign()
        case "%":
            service.percentage()
        case "+", "-", "×", "÷":
            if let operation = CalculatorService.Operation(rawValue: input) {
                service.setOperation(operation)
            }
        case "=":
            service.calculate()
        case ".":
            service.inputDecimal()
        case "0"..."9":
            service.inputNumber(input)
        default:
            break // Ignore unknown inputs
        }
    }
    
    func deleteLastDigit() {
        service.deleteLastDigit()
    }
}
