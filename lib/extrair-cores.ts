/**
 * Extrai a cor dominante de uma imagem base64 usando Canvas API.
 * Retorna a cor em formato hex.
 */
export async function extrairCorDominante(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 50
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve('#0ea5e9'); return }

      ctx.drawImage(img, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size).data

      // Acumula médias de pixels não-brancos e não-transparentes
      let r = 0, g = 0, b = 0, count = 0
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2], pa = data[i + 3]
        // Ignora brancos, cinzas claros e transparentes
        if (pa < 128) continue
        if (pr > 230 && pg > 230 && pb > 230) continue
        if (pr > 200 && pg > 200 && pb > 200 && Math.abs(pr - pg) < 20 && Math.abs(pg - pb) < 20) continue
        r += pr; g += pg; b += pb; count++
      }

      if (count === 0) { resolve('#0ea5e9'); return }

      r = Math.round(r / count)
      g = Math.round(g / count)
      b = Math.round(b / count)

      // Aumenta saturação para ficar mais vivo
      const [h, s, l] = rgbToHsl(r, g, b)
      const saturado = hslToRgb(h, Math.min(1, s * 1.4), Math.max(0.35, Math.min(0.55, l)))
      resolve(rgbToHex(saturado[0], saturado[1], saturado[2]))
    }
    img.onerror = () => resolve('#0ea5e9')
    img.src = base64
  })
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v] }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}
