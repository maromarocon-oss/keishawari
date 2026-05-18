(() => {
  const partials = [
    '/pages/intro.html',
    '/pages/group.html',
    '/pages/payments.html',
    '/pages/results.html',
    '/pages/privacy.html',
    '/pages/feedback.html',
    '/components/cookie-banner.html'
  ];

  const reveal = () => document.documentElement.classList.remove('js-loading');

  function hasInitialRoute() {
    try {
      if (location.hash && location.hash.startsWith('#d=')) return true;
      if (sessionStorage.getItem('keishawari_v1')) return true;
    } catch (e) {}
    return false;
  }

  async function loadPartials() {
    const root = document.getElementById('page-root');
    try {
      const htmlList = await Promise.all(
        partials.map(async (path) => {
          const res = await fetch(path);
          if (!res.ok) {
            throw new Error(`${path} の読み込みに失敗しました: ${res.status}`);
          }
          return res.text();
        })
      );

      root.innerHTML = htmlList.join('\n');

      // Intro (s0) is pure HTML/CSS; reveal immediately unless app.js
      // will redirect to a different screen (shared link or restored session).
      const waitForApp = hasInitialRoute();
      if (!waitForApp) reveal();

      const app = document.createElement('script');
      app.src = '/js/app.js';
      app.async = false;
      const finalize = () => {
        if (waitForApp) reveal();
        // Replay a startApp click queued before app.js was ready.
        if (window.__startAppPending) {
          window.__startAppPending = false;
          if (typeof window.startApp === 'function') {
            try { window.startApp(); } catch (e) {}
          }
        }
      };
      app.onload = finalize;
      app.onerror = finalize;
      document.body.appendChild(app);
    } catch (err) {
      console.error(err);
      reveal();
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
