import SwiftUI

struct ContentView: View {
    @StateObject private var model = WebViewModel(initialURL: AppConfig.homeURL)

    var body: some View {
        ZStack(alignment: .top) {
            Color(red: 0.96, green: 0.99, blue: 0.97)
                .ignoresSafeArea()

            WebView(model: model)
                .ignoresSafeArea(edges: .bottom)

            if model.isLoading && model.estimatedProgress < 1.0 {
                ProgressView(value: model.estimatedProgress)
                    .progressViewStyle(.linear)
                    .tint(AppConfig.brandColor)
                    .frame(height: 2)
                    .padding(.horizontal, 0)
                    .transition(.opacity)
            }

            if let error = model.loadError {
                OfflineView(message: error) {
                    model.reload()
                }
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: model.isLoading)
        .animation(.easeInOut(duration: 0.2), value: model.loadError)
    }
}

private struct OfflineView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Text("🍻")
                .font(.system(size: 72))
            Text("接続できませんでした")
                .font(.headline)
            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button(action: onRetry) {
                Text("再読み込み")
                    .font(.body.weight(.semibold))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(AppConfig.brandColor)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.96, green: 0.99, blue: 0.97))
    }
}
