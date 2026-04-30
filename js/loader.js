(() => {
  const partials = [
    './pages/intro.html',
    './pages/group.html',
    './pages/payments.html',
    './pages/results.html',
    './pages/privacy.html',
    './components/cookie-banner.html'
  ];

  async function loadPartials() {
    const root = document.getElementById('page-root');
    try {
      const htmlList = await Promise.all(
        partials.map(async (path) => {
          const res = await fetch(path, { cache: 'no-cache' });
          if (!res.ok) {
            throw new Error(`${path} の読み込みに失敗しました: ${res.status}`);
          }
          return res.text();
        })
      );

      root.innerHTML = htmlList.join('\n');

      const app = document.createElement('script');
      app.src = './js/app.js';
      app.defer = false;
      document.body.appendChild(app);
    } catch (err) {
      console.error(err);
      root.innerHTML = `
        <div style="max-width:480px;margin:40px auto;padding:20px;font-family:system-ui,sans-serif;line-height:1.7">
          <h1 style="font-size:20px;margin-bottom:8px">読み込みに失敗しました</h1>
          <p>このアプリは分割HTMLを読み込むため、ファイルを直接開くのではなく、Netlify・Live Server・ローカルサーバー上で開いてください。</p>
        </div>
      `;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPartials);
  } else {
    loadPartials();
  }
})();
