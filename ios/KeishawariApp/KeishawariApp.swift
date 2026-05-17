import SwiftUI

@main
struct KeishawariApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.light)
                .ignoresSafeArea(.keyboard)
        }
    }
}
