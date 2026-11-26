// Foto de perfil: recorta o centro em quadrado e reduz para um JPEG pequeno (cabe no perfil sem Storage).
export async function reduzirFoto(file, tam = 192) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Escolha um arquivo de imagem.')
  if (file.size > 12 * 1024 * 1024) throw new Error('Imagem muito grande (máximo 12 MB).')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((ok, err) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => err(new Error('Não consegui abrir essa imagem.'))
      i.src = url
    })
    const lado = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = (img.naturalWidth - lado) / 2
    const sy = (img.naturalHeight - lado) / 2
    const c = document.createElement('canvas')
    c.width = c.height = tam
    const g = c.getContext('2d')
    g.fillStyle = '#ffffff' // PNG com transparência vira fundo branco no JPEG
    g.fillRect(0, 0, tam, tam)
    g.imageSmoothingQuality = 'high'
    g.drawImage(img, sx, sy, lado, lado, 0, 0, tam, tam)
    return c.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}
