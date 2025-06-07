import Testing
import Foundation
@testable import CalculatorAppFeature

// MARK: - Calculator Basic Tests
@Suite("Calculator Basic Functionality")
struct CalculatorBasicTests {
    
    @Test("Calculator initializes with correct default values")
    func testInitialState() {
        let calculator = CalculatorService()
        #expect(calculator.display == "0")
        #expect(calculator.currentValue == 0)
        #expect(calculator.previousValue == 0)
        #expect(calculator.currentOperation == nil)
        #expect(calculator.willResetDisplay == false)
    }
    
    @Test("Clear function resets calculator to initial state")
    func testClear() {
        let calculator = CalculatorService()
        calculator.inputNumber("5")
        calculator.setOperation(.add)
        calculator.inputNumber("3")
        
        calculator.clear()
        
        #expect(calculator.display == "0")
        #expect(calculator.currentValue == 0)
        #expect(calculator.previousValue == 0)
    }
    
    @Test("This test should fail to verify error reporting")
    func testIntentionalFailure() {
        let calculator = CalculatorService()
        // This test is designed to fail to test error reporting
        #expect(calculator.display == "999", "This should fail - display should be 0, not 999")
        #expect(calculator.currentOperation == nil)
        #expect(calculator.willResetDisplay == false)
    }
}

// MARK: - Number Input Tests
@Suite("Number Input")
struct NumberInputTests {
    
    @Test("Adding single digit numbers")
    func testSingleDigitInput() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("5")
        #expect(calculator.display == "5")
        #expect(calculator.currentValue == 5)
    }
    
    @Test("Adding multiple digit numbers")
    func testMultipleDigitInput() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("1")
        calculator.inputNumber("2")
        calculator.inputNumber("3")
        
        #expect(calculator.display == "123")
        #expect(calculator.currentValue == 123)
    }
    
    @Test("Adding decimal numbers")
    func testDecimalInput() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("1")
        calculator.inputDecimal()
        calculator.inputNumber("5")
        
        #expect(calculator.display == "1.5")
        #expect(calculator.currentValue == 1.5)
    }
    
    @Test("Multiple decimal points should be ignored")
    func testMultipleDecimalPoints() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("1")
        calculator.inputDecimal()
        calculator.inputNumber("5")
        calculator.inputDecimal() // This should be ignored
        calculator.inputNumber("2")
        
        #expect(calculator.display == "1.52")
        #expect(calculator.currentValue == 1.52)
    }
    
    @Test("Decimal point at start creates 0.")
    func testDecimalAtStart() {
        let calculator = CalculatorService()
        
        calculator.inputDecimal()
        calculator.inputNumber("5")
        
        #expect(calculator.display == "0.5")
        #expect(calculator.currentValue == 0.5)
    }
}

// MARK: - Operation Tests
@Suite("Mathematical Operations")
struct OperationTests {
    
    @Test("Addition operation", arguments: [
        (5.0, 3.0, 8.0),
        (10.0, -2.0, 8.0),
        (0.0, 5.0, 5.0),
        (-3.0, -7.0, -10.0)
    ])
    func testAddition(a: Double, b: Double, expected: Double) {
        let result = CalculatorService.Operation.add.calculate(a, b)
        #expect(result == expected)
    }
    
    @Test("Subtraction operation", arguments: [
        (10.0, 3.0, 7.0),
        (5.0, 8.0, -3.0),
        (0.0, 5.0, -5.0),
        (-3.0, -7.0, 4.0)
    ])
    func testSubtraction(a: Double, b: Double, expected: Double) {
        let result = CalculatorService.Operation.subtract.calculate(a, b)
        #expect(result == expected)
    }
    
    @Test("Multiplication operation", arguments: [
        (5.0, 3.0, 15.0),
        (4.0, -2.0, -8.0),
        (0.0, 5.0, 0.0),
        (-3.0, -7.0, 21.0)
    ])
    func testMultiplication(a: Double, b: Double, expected: Double) {
        let result = CalculatorService.Operation.multiply.calculate(a, b)
        #expect(result == expected)
    }
    
    @Test("Division operation", arguments: [
        (10.0, 2.0, 5.0),
        (15.0, 3.0, 5.0),
        (-8.0, 2.0, -4.0),
        (7.0, 2.0, 3.5)
    ])
    func testDivision(a: Double, b: Double, expected: Double) {
        let result = CalculatorService.Operation.divide.calculate(a, b)
        #expect(result == expected)
    }
    
    @Test("Division by zero returns zero")
    func testDivisionByZero() {
        let result = CalculatorService.Operation.divide.calculate(10.0, 0.0)
        #expect(result == 0.0)
    }
}

// MARK: - Calculator Integration Tests
@Suite("Calculator Integration Tests")
struct CalculatorIntegrationTests {
    
    @Test("Simple addition calculation")
    func testSimpleAddition() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("5")
        calculator.setOperation(.add)
        calculator.inputNumber("3")
        calculator.calculate()
        
        #expect(calculator.display == "8")
        #expect(calculator.currentValue == 8)
    }
    
    @Test("Chain calculations")
    func testChainCalculations() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("5")
        calculator.setOperation(.add)
        calculator.inputNumber("3")
        calculator.setOperation(.multiply) // Should calculate 5+3=8 first
        calculator.inputNumber("2")
        calculator.calculate()
        
        #expect(calculator.currentValue == 16) // (5+3) * 2 = 16
    }
    
    @Test("Complex calculation sequence")
    func testComplexCalculation() {
        let calculator = CalculatorService()
        
        // Calculate: 10 + 5 * 2 - 3
        calculator.inputNumber("1")
        calculator.inputNumber("0")
        calculator.setOperation(.add)
        calculator.inputNumber("5")
        calculator.setOperation(.multiply)
        calculator.inputNumber("2")
        calculator.setOperation(.subtract)
        calculator.inputNumber("3")
        calculator.calculate()
        
        #expect(calculator.currentValue == 27) // ((10+5)*2)-3 = 27
    }

    @Test("Repetitive equals press repeats last operation")
    func testRepetitiveEquals() {
        let calculator = CalculatorService()

        calculator.inputNumber("5")
        calculator.setOperation(.add)
        calculator.inputNumber("3")
        calculator.calculate() // 5 + 3 = 8

        #expect(calculator.currentValue == 8)

        calculator.calculate() // Should be 8 + 3 = 11
        #expect(calculator.currentValue == 11)

        calculator.calculate() // Should be 11 + 3 = 14
        #expect(calculator.currentValue == 14)
    }

    @Test("Expression display updates correctly")
    func testExpressionDisplay() {
        let calculator = CalculatorService()

        calculator.inputNumber("1")
        calculator.inputNumber("2")
        #expect(calculator.expressionDisplay == "")

        calculator.setOperation(.add)
        #expect(calculator.expressionDisplay == "12 +")

        calculator.inputNumber("3")
        #expect(calculator.expressionDisplay == "12 +") 

        calculator.calculate()
        #expect(calculator.expressionDisplay == "12 + 3 =")
    }
}

// MARK: - Special Functions Tests
@Suite("Special Functions")
struct SpecialFunctionsTests {
    
    @Test("Toggle sign on positive number")
    func testToggleSignPositive() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("5")
        calculator.toggleSign()
        
        #expect(calculator.display == "-5")
        #expect(calculator.currentValue == -5)
    }
    
    @Test("Toggle sign on negative number")
    func testToggleSignNegative() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("5")
        calculator.toggleSign()
        calculator.toggleSign()
        
        #expect(calculator.display == "5")
        #expect(calculator.currentValue == 5)
    }
    
    @Test("Toggle sign on zero has no effect")
    func testToggleSignZero() {
        let calculator = CalculatorService()
        
        calculator.toggleSign()
        
        #expect(calculator.display == "0")
        #expect(calculator.currentValue == 0)
    }
    
    @Test("Percentage calculation", arguments: [
        ("100", 1.0),
        ("50", 0.5),
        ("25", 0.25),
        ("200", 2.0)
    ])
    func testPercentage(input: String, expected: Double) {
        let calculator = CalculatorService()
        
        calculator.inputNumber(input)
        calculator.percentage()
        
        #expect(calculator.currentValue == expected)
    }
}

// MARK: - Input Handler Tests
@Suite("Input Handler Integration")
struct InputHandlerTests {
    
    @Test("Number input through handler")
    func testNumberInputThroughHandler() {
        let calculator = CalculatorService()
        let handler = CalculatorInputHandler(service: calculator)
        
        handler.handleInput("1")
        handler.handleInput("2")
        handler.handleInput("3")
        
        #expect(calculator.display == "123")
    }
    
    @Test("Operation input through handler")
    func testOperationInputThroughHandler() {
        let calculator = CalculatorService()
        let handler = CalculatorInputHandler(service: calculator)
        
        handler.handleInput("5")
        handler.handleInput("+")
        handler.handleInput("3")
        handler.handleInput("=")
        
        #expect(calculator.currentValue == 8)
    }
    
    @Test("Clear input through handler")
    func testClearInputThroughHandler() {
        let calculator = CalculatorService()
        let handler = CalculatorInputHandler(service: calculator)
        
        handler.handleInput("5")
        handler.handleInput("+")
        handler.handleInput("3")
        handler.handleInput("C")
        
        #expect(calculator.display == "0")
        #expect(calculator.currentValue == 0)
    }
    
    @Test("Decimal input through handler")
    func testDecimalInputThroughHandler() {
        let calculator = CalculatorService()
        let handler = CalculatorInputHandler(service: calculator)
        
        handler.handleInput("1")
        handler.handleInput(".")
        handler.handleInput("5")
        
        #expect(calculator.display == "1.5")
    }
}

// MARK: - Edge Cases Tests
@Suite("Edge Cases")
struct EdgeCaseTests {
    
    @Test("Calculate without setting operation")
    func testCalculateWithoutOperation() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("5")
        calculator.calculate()
        
        #expect(calculator.currentValue == 5) // Should remain unchanged
    }
    
    @Test("Setting operation without previous number")
    func testOperationWithoutPreviousNumber() {
        let calculator = CalculatorService()
        
        calculator.setOperation(.add)
        calculator.inputNumber("5")
        calculator.calculate()
        
        #expect(calculator.currentValue == 5) // 0 + 5 = 5
    }
    
    @Test("Multiple equals presses")
    func testMultipleEquals() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("5")
        calculator.setOperation(.add)
        calculator.inputNumber("3")
        calculator.calculate()
        
        let firstResult = calculator.currentValue
        calculator.calculate() // Second equals press
        
        #expect(firstResult == 8)
        #expect(calculator.currentValue == 11) // Should repeat last operation: 8 + 3 = 11
    }
}

// MARK: - Error Handling Tests
@Suite("Error Handling")
struct ErrorHandlingTests {
    
    @Test("Calculator handles invalid input gracefully")
    func testInvalidInputHandling() {
        let calculator = CalculatorService()
        let handler = CalculatorInputHandler(service: calculator)
        
        // Test pressing operation without any number
        handler.handleInput("+")
        handler.handleInput("5")
        handler.handleInput("=")
        
        #expect(calculator.currentValue == 5) // Should be 0 + 5 = 5
    }
    
    @Test("Calculator state after multiple clears")
    func testMultipleClearOperations() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("123")
        calculator.setOperation(.add)
        calculator.inputNumber("456")
        
        // Multiple clear operations
        calculator.clear()
        calculator.clear()
        calculator.clear()
        
        #expect(calculator.display == "0")
        #expect(calculator.currentValue == 0)
        #expect(calculator.currentOperation == nil)
    }
    
    @Test("Large number error handling")
    func testLargeNumberError() {
        let calculator = CalculatorService()
        calculator.inputNumber("1000000000000") // 1e12
        calculator.setOperation(.multiply)
        calculator.inputNumber("2")
        calculator.calculate()

        #expect(calculator.hasError == true)
        #expect(calculator.display == "Error")
        #expect(calculator.expressionDisplay == "Number too large")
    }
}

// MARK: - Decimal Edge Cases
@Suite("Decimal Edge Cases")
struct DecimalEdgeCaseTests {
    
    @Test("Very small decimal numbers")
    func testVerySmallDecimals() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("0")
        calculator.inputDecimal()
        calculator.inputNumber("0")
        calculator.inputNumber("0")
        calculator.inputNumber("1")
        
        #expect(calculator.display == "0.001")
        #expect(calculator.currentValue == 0.001)
    }
    
    @Test("Decimal operations precision")
    func testDecimalPrecision() {
        let calculator = CalculatorService()
        
        calculator.inputNumber("0")
        calculator.inputDecimal()
        calculator.inputNumber("1")
        calculator.setOperation(.add)
        calculator.inputNumber("0")
        calculator.inputDecimal()
        calculator.inputNumber("2")
        calculator.calculate()
        
        // 0.1 + 0.2 should equal 0.3 (within floating point precision)
        #expect(abs(calculator.currentValue - 0.3) < 0.0001)
    }
}
