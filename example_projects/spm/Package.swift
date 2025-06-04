// swift-tools-version: 6.1
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "spm",
    platforms: [
        .macOS(.v15),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.5.1"),
    ],
    targets: [
        .executableTarget(
            name: "spm"
        ),
        .executableTarget(
            name: "quick-task",
            dependencies: [
                "TestLib",
                .product(name: "ArgumentParser", package: "swift-argument-parser"),
            ]
        ),
        .executableTarget(
            name: "long-server",
            dependencies: [
                "TestLib", 
                .product(name: "ArgumentParser", package: "swift-argument-parser"),
            ]
        ),
        .target(
            name: "TestLib"
        ),
        .testTarget(
            name: "TestLibTests",
            dependencies: ["TestLib"]
        ),
    ]
)
