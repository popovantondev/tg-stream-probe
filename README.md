# TG Stream (probe)

Experimental static page: plays videos from your own Telegram channel right in Safari — no server.
The page logs into Telegram in the browser (GramJS, MTProto over WebSocket) and a service worker
feeds the `<video>` element with byte ranges fetched on demand.

API keys and the login session stay in your browser's localStorage only. "Выйти и стереть" logs out.
