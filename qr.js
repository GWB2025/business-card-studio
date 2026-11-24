(function (root) {
  'use strict';

  const encoder = typeof module === 'object' && module.exports
    ? require('./vendor/qrcode.js') : root.qrcode;
  const quietModules = 4;
  let lastAddress, lastSymbol;

  function symbolFor(value) {
    const address = value.trim();
    let parsed;
    try { parsed = new URL(address); } catch { /* Give the same field hint for all invalid addresses. */ }
    if (!parsed || !/^https?:\/\//i.test(address) || /\s/.test(address) || !parsed.hostname) {
      throw Error('Enter a full website address beginning with https:// or http://.');
    }
    // Preserve ASCII URLs verbatim. Punycode and percent escapes make international URLs portable.
    const payload = /[^\x21-\x7e]/.test(address) ? parsed.href : address;
    if (payload === lastAddress) return lastSymbol;
    if (payload.length > 2331) throw Error('Use a shorter URL for this QR code.');
    const symbol = encoder(0, 'M');
    symbol.addData(payload, 'Byte');
    symbol.make();
    lastAddress = payload;
    lastSymbol = symbol;
    return symbol;
  }

  function plot(design) {
    const symbol = symbolFor(design.qrUrl);
    const count = symbol.getModuleCount();
    const columnLeft = design.width * 0.56;
    const columnWidth = design.width - design.margin - columnLeft;
    const availableHeight = design.height - 2 * design.margin;
    const captionSize = Math.min(2.2, design.bodySize);
    const captionGap = 1.5 + design.stroke;
    const side = Math.min(columnWidth, availableHeight - captionGap - captionSize - design.stroke);
    const pitch = side / (count + 2 * quietModules);
    if (pitch < 1.5 * design.stroke) {
      throw Error('The QR squares are too small for this pen. Use a shorter URL, a finer pen or a wider card.');
    }

    const left = columnLeft + (columnWidth - side) / 2;
    const top = design.margin + (availableHeight - side - captionGap - captionSize) / 2;
    const radius = design.stroke / 2;
    const intervals = Math.ceil((pitch - design.stroke) / (design.stroke * 0.8));
    const paths = [];
    for (let row = 0; row < count; row++) {
      const rowTop = top + (row + quietModules) * pitch;
      for (let col = 0; col < count;) {
        if (!symbol.isDark(row, col)) { col++; continue; }
        const first = col;
        while (col < count && symbol.isDark(row, col)) col++;
        // Hatch each dark run continuously. The inset keeps round pen caps inside it.
        const x1 = left + (first + quietModules) * pitch + radius;
        const x2 = left + (col + quietModules) * pitch - radius;
        const path = [];
        for (let pass = 0; pass <= intervals; pass++) {
          const y = rowTop + radius + (pitch - design.stroke) * pass / intervals;
          path.push([pass % 2 ? x2 : x1, y], [pass % 2 ? x1 : x2, y]);
        }
        paths.push(path);
      }
    }
    return { paths, left, top, side, pitch, captionSize, captionTop: top + side + captionGap };
  }

  const api = { plot };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CardQr = api;
})(typeof window === 'undefined' ? globalThis : window);
