const test = require('node:test');
const assert = require('node:assert/strict');
const { build, defaults, validate } = require('../card.js');
const fonts = require('../fonts.json');

const destination = 'https://github.com/GWB2025';
const design = { ...defaults, showQr: true, qrUrl: destination };
const cardFor = changes => build({ ...design, ...changes }, fonts);

test('existing designs keep their motif unless QR is enabled', () => {
  assert.equal(validate({}).showQr, false);
  assert.doesNotMatch(cardFor({ showQr: false, qrUrl: '' }).svg, /id="qr-code"/);
  assert.match(cardFor({}).svg, /<g id="qr-code"><path d="M /);
});

test('requires a valid HTTP(S) address only for enabled QR codes', () => {
  for (const qrUrl of ['', 'https://', 'hello', 'javascript:alert(1)', 'https://ex ample.org']) {
    assert.throws(() => cardFor({ qrUrl }), /website address/i);
  }
});

test('the saved URL round-trips and a changed URL changes the pen paths', () => {
  const qrUrl = 'https://example.org/cards?index=2&source=pen#details';
  const saved = JSON.parse(JSON.stringify(validate({ ...design, qrUrl })));
  assert.equal(saved.qrUrl, qrUrl);
  assert.equal(saved.showQr, true);
  assert.notDeepEqual(cardFor({ qrUrl }).qr.paths, cardFor({}).qr.paths);
  assert.deepEqual(build(saved, fonts).qr.paths, cardFor({ qrUrl }).qr.paths);
});

test('reserves four blank modules around the code, including the pen radius', () => {
  for (const stock of [{}, { width: 90, height: 50 }, { width: 54, height: 85, stroke: 0.25 }]) {
    const { qr, paths, design: d } = cardFor(stock);
    const inset = 4 * qr.pitch + d.stroke / 2 - 1e-7;
    const left = qr.left + inset, right = qr.left + qr.side - inset;
    const top = qr.top + inset, bottom = qr.top + qr.side - inset;
    assert.ok(qr.paths.length > 0);
    const ink = new Set(qr.paths);
    for (const path of paths) {
      for (const [x,y] of path) {
        if (ink.has(path)) {
          assert.ok(x >= left && x <= right && y >= top && y <= bottom);
        } else {
          assert.ok(x <= qr.left - d.stroke / 2 || x >= qr.left + qr.side + d.stroke / 2 ||
            y <= qr.top - d.stroke / 2 || y >= qr.top + qr.side + d.stroke / 2);
        }
      }
    }
  }
});

test('the NFC lettering stays on the chip with QR selected', () => {
  const label = svg => svg.match(/<g id="tap-prompt">.*?<\/g>/)[0];
  assert.equal(label(cardFor({}).svg), label(cardFor({ showQr: false }).svg));
  assert.doesNotMatch(cardFor({ showNfc: false }).svg, /id="tap-prompt"/);
});

test('a long URL and thick pen cannot silently produce an unusable code', () => {
  assert.throws(() => cardFor({ qrUrl: 'https://example.org/' + 'a'.repeat(250), stroke: 1.2 }),
    /shorter URL|finer pen/i);
});

test('screen renders the encoded square grid with a white quiet zone, independent of pen colour', () => {
  const encoder = require('../vendor/qrcode.js');
  for (const qrUrl of [destination, 'https://example.org/path?x=1&y=2#test']) {
    const symbol = encoder(0, 'M');
    symbol.addData(qrUrl, 'Byte');
    symbol.make();
    const count = symbol.getModuleCount();
    const { qr, svg, previewSvg } = cardFor({ qrUrl, colour: '#dedede' });
    assert.match(qr.screenSvg, new RegExp('viewBox="0 0 ' + (count + 8) + ' ' + (count + 8) + '"'));
    assert.match(qr.screenSvg, /fill="#fff"/);
    assert.match(qr.screenSvg, /fill="#000"/);
    const raster = Array.from({ length: count + 8 }, () => Array(count + 8).fill(false));
    for (const [, x, y, width] of qr.screenSvg.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
      raster[Number(y)].fill(true, Number(x), Number(x) + Number(width));
    }
    for (let y = 0; y < count + 8; y++) {
      for (let x = 0; x < count + 8; x++) {
        const inside = x >= 4 && x < count + 4 && y >= 4 && y < count + 4;
        assert.equal(raster[y][x], inside && symbol.isDark(y - 4, x - 4));
      }
    }
    assert.ok(previewSvg.includes(qr.screenSvg));
    assert.doesNotMatch(svg, /<rect|crispEdges/);
  }
  const motif = cardFor({ showQr: false });
  assert.equal(motif.previewSvg, motif.svg);
});

test('QR pen strokes are straight horizontal spans visiting each scanline in order', () => {
  const { qr } = cardFor({});
  let previousY = -Infinity, previousEnd, direction;
  for (const path of qr.paths) {
    assert.equal(path.length, 2);
    const [[x1, y], [x2, endY]] = path;
    assert.equal(endY, y);
    assert.ok(y >= previousY);
    if (y > previousY) {
      direction = Math.sign(x2 - x1);
    } else {
      assert.equal(Math.sign(x2 - x1), direction);
      assert.ok((x1 - previousEnd) * direction > 0);
    }
    previousY = y;
    previousEnd = x2;
  }
});

test('the exported pen footprint covers every dark cell centre and leaves every light centre clear', () => {
  const encoder = require('../vendor/qrcode.js');
  for (const stock of [{}, { width: 54, height: 85, stroke: 0.25 }, { stroke: 0.65 }]) {
    const { qr, svg, design: d } = cardFor(stock);
    const symbol = encoder(0, 'M');
    symbol.addData(destination, 'Byte');
    symbol.make();
    const group = svg.match(/<g id="qr-code">(.*?)<\/g>/)[1];
    const segments = Array.from(group.matchAll(/<path d="M ([\d.]+),([\d.]+) L ([\d.]+),([\d.]+)"\/>/g),
      match => match.slice(1).map(Number));
    assert.equal(segments.length, qr.paths.length);
    for (let row = 0; row < symbol.getModuleCount(); row++) {
      const y = qr.top + (row + 4.5) * qr.pitch;
      const nearby = segments.filter(([, startY]) => Math.abs(y - startY) <= d.stroke / 2);
      for (let col = 0; col < symbol.getModuleCount(); col++) {
        const x = qr.left + (col + 4.5) * qr.pitch;
        const covered = nearby.some(([a, sy, b]) => {
          const dx = Math.max(Math.min(a, b) - x, 0, x - Math.max(a, b));
          return Math.hypot(dx, y - sy) <= d.stroke / 2;
        });
        assert.equal(covered, symbol.isDark(row, col), `row ${row}, column ${col}`);
      }
    }
  }
});
