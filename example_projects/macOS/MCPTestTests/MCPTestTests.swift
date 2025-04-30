//
//  MCPTestTests.swift
//  MCPTestTests
//
//  Created by Cameron on 16/02/2025.
//

import Testing
@testable import MCPTest

struct MCPTestTests {

    @Test func example() async throws {
        #expect(1 == 1)
    }

    @Test func example3() async throws {
        #expect(1 == 2)
    }
}
