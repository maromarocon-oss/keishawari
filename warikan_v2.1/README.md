# warikan_v2.1

`warikan_v2.html` を、ページ単位のHTML・共通CSS・共通JSに分割した版です。

## 構成

```txt
warikan_v2.1/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ loader.js
│  └─ app.js
├─ pages/
│  ├─ intro.html
│  ├─ group.html
│  ├─ payments.html
│  ├─ results.html
│  └─ privacy.html
├─ components/
│  └─ cookie-banner.html
├─ netlify.toml
└─ README.md
```

## ファイルの役割

- `index.html`：Netlifyで最初に読み込まれる入口ファイル
- `css/style.css`：元HTML内の `<style>` を外部CSS化したもの
- `js/loader.js`：各ページHTMLを読み込み、最後にアプリ本体JSを起動するローダー
- `js/app.js`：元HTML内の `<script>` を外部JS化したもの
- `pages/*.html`：画面ごとに分割したHTML
- `components/cookie-banner.html`：全画面共通のCookie通知部分

## 注意

分割HTMLを `fetch()` で読み込むため、`index.html` をダブルクリックして直接開くとブラウザ制限で動かない場合があります。  
ローカル確認時は VS Code の Live Server か、以下のようなローカルサーバーを使ってください。

```bash
cd warikan_v2.1
python -m http.server 8000
```

その後、ブラウザで `http://localhost:8000/` を開きます。

## Netlifyへの公開手順

1. Netlifyにログイン
2. 「Add new site」または「Sites」から新規サイト作成
3. `warikan_v2.1` フォルダをドラッグ＆ドロップ
4. デプロイ完了後、発行されたURLを開く

ビルド処理は不要です。静的ファイルとしてそのまま公開できます。
