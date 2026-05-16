# けいしゃ割 iOS アプリ

`https://keishawari.com/` を WKWebView でラップした iOS アプリです。

## 構成

- **方針**: WKWebView ラッパー（既存 Web 版と完全に同一の挙動）
- **フレームワーク**: SwiftUI + WKWebView + SafariServices
- **最低対応バージョン**: iOS 16.0
- **対応デバイス**: iPhone / iPad
- **言語**: 日本語 (ja_JP)
- **Bundle ID**: `com.keishawari.app`

## ディレクトリ

```
ios/
├── project.yml                 # XcodeGen 用プロジェクト定義
├── KeishawariApp/
│   ├── KeishawariApp.swift     # @main エントリーポイント
│   ├── ContentView.swift       # ルート View
│   ├── WebView.swift           # WKWebView ラッパー + WebViewModel
│   ├── AppConfig.swift         # URL / 配色など定数
│   ├── Info.plist
│   ├── Assets.xcassets/
│   └── Preview Content/
└── README.md
```

## ビルド手順

`.xcodeproj` は Git 管理外です。[XcodeGen](https://github.com/yonaskolb/XcodeGen) で生成してください。

```bash
# 1. XcodeGen をインストール (初回のみ)
brew install xcodegen

# 2. ios/ ディレクトリで .xcodeproj を生成
cd ios
xcodegen generate

# 3. Xcode で開く
open KeishawariApp.xcodeproj
```

Xcode で `Signing & Capabilities` の Team を自分の Apple Developer Team に設定後、実機 or シミュレータで Run できます。

## 機能

- ✅ `https://keishawari.com/` をフルスクリーン表示
- ✅ Pull-to-refresh で再読み込み
- ✅ 戻る/進む スワイプジェスチャ
- ✅ 進捗バー表示
- ✅ オフライン時のエラー画面 + 再読み込みボタン
- ✅ 外部リンク（keishawari.com 以外）は SFSafariViewController で開く
- ✅ `tel:` / `mailto:` / `sms:` / `paypay:` / `line:` URL スキームを OS に委譲
- ✅ App Transport Security: keishawari.com のみ許可
- ✅ ブランドカラー `#2A9055` 反映
- ✅ Web 版に `KeishawariApp/1.0 (iOS)` の UA サフィックスを付与（必要なら Web 側で出し分け可能）

## AppIcon

`Assets.xcassets/AppIcon.appiconset/` に 1024×1024 PNG (`AppIcon-1024.png`) を配置してください。現状はプレースホルダ（ファイル未配置）です。

## 注意

- このプロジェクトは Web コンテンツに依存します。`keishawari.com` の挙動を変えるとアプリの挙動も変わります。
- Web 側で iOS アプリ判定が必要な場合は User-Agent に `KeishawariApp/1.0 (iOS)` が含まれるかで判定してください。
- App Store 申請時は、Apple のレビューガイドライン 4.2 (Minimum Functionality) を満たすため、Web ビューに留まらないネイティブ機能（共有・お気に入り等）の追加検討を推奨します。
