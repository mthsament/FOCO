// Carregado pelo service worker do app (importScripts). Recebe o "toque" do servidor, busca o texto do
// lembrete e mostra a notificação. O iOS exige mostrar uma notificação a cada push.
function lerCfg() {
  return new Promise((resolve) => {
    try {
      const abrir = indexedDB.open('keyval-store')
      abrir.onerror = () => resolve(null)
      abrir.onsuccess = () => {
        try {
          const req = abrir.result.transaction('keyval').objectStore('keyval').get('foco-push-cfg')
          req.onsuccess = () => resolve(req.result || null)
          req.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      }
    } catch {
      resolve(null)
    }
  })
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let titulo = 'FOCO'
      let corpo = 'Você tem um lembrete.'
      try {
        const cfg = await lerCfg()
        if (cfg?.url) {
          const r = await fetch(cfg.url.replace(/\/+$/, '') + '/mensagem', { headers: { Authorization: 'Bearer ' + cfg.token } })
          if (r.ok) {
            const j = await r.json()
            titulo = j.titulo || titulo
            corpo = j.corpo || corpo
          }
        }
      } catch {
        /* sem rede: mostra o aviso genérico */
      }
      await self.registration.showNotification(titulo, { body: corpo, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'foco-lembrete' })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) if ('focus' in c) return c.focus()
      return self.clients.openWindow(self.registration.scope)
    }),
  )
})
