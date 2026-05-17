import SwiftUI

enum AppConfig {
    static let homeURL = URL(string: "https://keishawari.com/")!
    static let allowedHosts: Set<String> = ["keishawari.com", "www.keishawari.com"]
    static let brandColor = Color(red: 42.0 / 255.0, green: 144.0 / 255.0, blue: 85.0 / 255.0)
    static let userAgentSuffix = "KeishawariApp/1.0 (iOS)"
}
