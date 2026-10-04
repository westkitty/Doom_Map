export async function registerOfflineShell(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return null

  const scriptUrl = new URL('sw.js', document.baseURI)
  const scopeUrl = new URL('./', document.baseURI)
  try {
    return await navigator.serviceWorker.register(scriptUrl.pathname, { scope: scopeUrl.pathname })
  } catch (error) {
    console.warn('Doom Map offline shell registration failed.', error)
    return null
  }
}
