import SwiftUI
import WebKit
import SafariServices

@MainActor
final class WebViewModel: NSObject, ObservableObject {
    @Published var isLoading: Bool = false
    @Published var estimatedProgress: Double = 0
    @Published var loadError: String? = nil

    let initialURL: URL
    weak var webView: WKWebView?
    private var observations: [NSKeyValueObservation] = []

    init(initialURL: URL) {
        self.initialURL = initialURL
        super.init()
    }

    func attach(_ webView: WKWebView) {
        self.webView = webView
        observations.append(webView.observe(\.estimatedProgress, options: [.new]) { [weak self] webView, _ in
            Task { @MainActor in
                self?.estimatedProgress = webView.estimatedProgress
            }
        })
        observations.append(webView.observe(\.isLoading, options: [.new]) { [weak self] webView, _ in
            Task { @MainActor in
                self?.isLoading = webView.isLoading
            }
        })
    }

    func reload() {
        loadError = nil
        if let webView, webView.url != nil {
            webView.reload()
        } else {
            webView?.load(URLRequest(url: initialURL))
        }
    }
}

struct WebView: UIViewRepresentable {
    @ObservedObject var model: WebViewModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        webView.scrollView.bounces = true
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.96, green: 0.99, blue: 0.97, alpha: 1.0)
        webView.scrollView.backgroundColor = .clear

        if let userAgent = webView.value(forKey: "userAgent") as? String, !userAgent.isEmpty {
            webView.customUserAgent = userAgent + " " + AppConfig.userAgentSuffix
        } else {
            webView.customUserAgent = AppConfig.userAgentSuffix
        }

        let refresh = UIRefreshControl()
        refresh.tintColor = UIColor(red: 42.0 / 255.0, green: 144.0 / 255.0, blue: 85.0 / 255.0, alpha: 1.0)
        refresh.addTarget(context.coordinator, action: #selector(Coordinator.handleRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        model.attach(webView)
        webView.load(URLRequest(url: model.initialURL))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let model: WebViewModel

        init(model: WebViewModel) {
            self.model = model
        }

        @objc func handleRefresh(_ sender: UIRefreshControl) {
            Task { @MainActor in
                model.webView?.reload()
                try? await Task.sleep(nanoseconds: 600_000_000)
                sender.endRefreshing()
            }
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            let scheme = url.scheme?.lowercased() ?? ""

            if scheme == "tel" || scheme == "mailto" || scheme == "sms" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            if scheme == "paypay" || scheme == "line" || scheme.hasPrefix("itms") || scheme.hasPrefix("itmss") {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            if scheme == "http" || scheme == "https" {
                let host = url.host?.lowercased() ?? ""
                let isExternalTap = navigationAction.navigationType == .linkActivated
                    && !AppConfig.allowedHosts.contains(host)
                if isExternalTap {
                    openInSafari(url)
                    decisionHandler(.cancel)
                    return
                }
                decisionHandler(.allow)
                return
            }

            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.cancel)
            }
        }

        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url {
                openInSafari(url)
            }
            return nil
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            Task { @MainActor in
                model.loadError = nil
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            Task { @MainActor in
                model.loadError = nil
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handle(error: error)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            handle(error: error)
        }

        private func handle(error: Error) {
            let nsError = error as NSError
            if nsError.code == NSURLErrorCancelled { return }
            Task { @MainActor in
                model.loadError = nsError.localizedDescription
            }
        }

        @MainActor
        private func openInSafari(_ url: URL) {
            guard let scene = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first(where: { $0.activationState == .foregroundActive }),
                  let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
                UIApplication.shared.open(url)
                return
            }
            let safari = SFSafariViewController(url: url)
            safari.preferredControlTintColor = UIColor(red: 42.0 / 255.0, green: 144.0 / 255.0, blue: 85.0 / 255.0, alpha: 1.0)
            root.present(safari, animated: true)
        }
    }
}
