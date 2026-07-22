// Sultan Sales Control — Service Worker
// نفس فلسفة sw.js بتاع Sultan ERP الرئيسي: قشرة التطبيق (HTML/CSS/JS)
// تتخزّن للعمل أوفلاين، لكن أي طلب لـ Supabase يفضل يروح للشبكة كل مرة
// (بيانات حية، صفر تخزين مؤقت).

const SHELL_CACHE = 'sultan-sales-shell-v2';
const SUPABASE_HOST = 'fanaozxqlodzfdgstwaz.supabase.co';

const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_CACHE).then(c => Promise.allSettled(SHELL_URLS.map(u => c.add(u)))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k)))),
    ])
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // بيانات Supabase الحية: شبكة فقط، بدون أي تخزين مؤقت
  if (url.hostname === SUPABASE_HOST) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(
        JSON.stringify({ error: 'offline', message: 'لا يوجد اتصال بالإنترنت حالياً' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // قشرة التطبيق: network-first + رجوع للكاش لو الشبكة فشلت
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
  );
});
