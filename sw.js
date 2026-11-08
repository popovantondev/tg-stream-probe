// Service worker пробы: запросы плеера к stream/<id> с заголовком Range передаёт странице
// (у неё вход в Telegram) и возвращает плееру ответ 206 с нужным куском.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const m = new URL(e.request.url).pathname.match(/\/stream\/(\d+)$/);
  if (!m) return;
  e.respondWith(handle(e, Number(m[1])));
});

async function pageFor(e) {
  const c = e.clientId && await self.clients.get(e.clientId);
  if (c) return c;
  const all = await self.clients.matchAll({ type: 'window' });
  return all[0];
}

async function handle(e, id) {
  const h = e.request.headers.get('range') || 'bytes=0-';
  const mm = /bytes=(\d*)-(\d*)/.exec(h) || [];
  const start = mm[1] ? Number(mm[1]) : 0;
  const end = mm[2] ? Number(mm[2]) : null;
  const page = await pageFor(e);
  if (!page) return new Response('нет открытой страницы', { status: 503 });
  const ch = new MessageChannel();
  const answer = new Promise((res, rej) => {
    ch.port1.onmessage = (ev) => (ev.data.ok ? res(ev.data) : rej(new Error(ev.data.error)));
    setTimeout(() => rej(new Error('нет ответа 60 с')), 60000);
  });
  page.postMessage({ type: 'range', id, start, end }, [ch.port2]);
  try {
    const r = await answer;
    if (start >= r.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${r.size}` } });
    return new Response(r.buf, {
      status: 206,
      headers: {
        'Content-Type': r.type || 'video/mp4',
        'Content-Range': `bytes ${r.rStart}-${r.rEnd}/${r.size}`,
        'Content-Length': String(r.buf.byteLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(String(err.message || err), { status: 502 });
  }
}
