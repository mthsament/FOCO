(async function () {
  const current = document.currentScript;
  const configPath = current.dataset.config || 'config.json';
  const base = new URL('.', location.href);
  const loading = document.getElementById('loading');
  const say = (message) => { if (loading) loading.textContent = message; };
  const objectUrls = [];
  try {
    const config = await (await fetch(new URL(configPath, base))).json();
    say('Carregando recursos...');
    const assetUrls = {};
    await Promise.all(Object.entries(config.assets || {}).map(async ([id, item]) => {
      const response = await fetch(new URL(item.path, base));
      if (!response.ok) throw new Error(`Falha ao carregar recurso ${id}: HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(new Blob([blob], { type: item.mime || blob.type || 'application/octet-stream' }));
      objectUrls.push(url);
      assetUrls[id] = url;
    }));
    const extMap = {};
    for (const item of (config.externalResources || [])) {
      if (assetUrls[item.uuid]) extMap[item.id] = assetUrls[item.uuid];
    }
    window.__resources = extMap;

    say('Montando interface...');
    const [templateResponse, logicResponse] = await Promise.all([
      fetch(new URL(config.template, base)),
      fetch(new URL(config.logic, base))
    ]);
    if (!templateResponse.ok || !logicResponse.ok) throw new Error('Não foi possível carregar o HTML ou JavaScript da página.');
    let source = await templateResponse.text();
    let logic = await logicResponse.text();
    for (const [id, url] of Object.entries(assetUrls)) {
      source = source.split(id).join(url);
      logic = logic.split(id).join(url);
    }
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const dcScript = parsed.querySelector('script[data-dc-script]');
    if (dcScript) dcScript.textContent = logic;
    document.documentElement.replaceWith(parsed.documentElement);

    // Recreate scripts so external runtime scripts execute after the document replacement.
    for (const oldScript of Array.from(document.scripts)) {
      const newScript = document.createElement('script');
      for (const attr of Array.from(oldScript.attributes)) newScript.setAttribute(attr.name, attr.value);
      newScript.textContent = oldScript.textContent;
      const loaded = newScript.src ? new Promise((resolve) => { newScript.onload = resolve; newScript.onerror = resolve; }) : null;
      oldScript.replaceWith(newScript);
      if (loaded) await loaded;
    }
  } catch (error) {
    console.error('[Mascote Canguru]', error);
    say('Erro ao carregar: ' + error.message);
  }
  window.addEventListener('pagehide', () => objectUrls.forEach(URL.revokeObjectURL), { once: true });
})();
