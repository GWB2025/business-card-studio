const assert = require('node:assert/strict');
const test = require('node:test');
const { build, defaults } = require('../card.js');
const fonts = require('../fonts.json');

test('exports the default NFC card as millimetre-sized pen paths', () => {
  const card = build(defaults, fonts);
  assert.match(card.svg, /width="85mm" height="54mm" viewBox="0 0 85 54"/);
  assert.match(card.svg, /<path d="M /);
  assert.doesNotMatch(card.svg, /<(text|image|rect)\b/);
  assert.ok(card.length > 0);
});

test('each motif and font fits inside the safe margin on a portrait card', () => {
  for (const motif of ['vortex', 'waves', 'orbit']) {
    for (const font of fonts) {
      const design = { ...defaults, width: 54, height: 85, font: font.id, motif };
      const card = build(design, fonts);
      assert.ok(card.paths.length > 0);
      for (const path of card.paths) {
        for (const [x, y] of path) {
          const tolerance = 1e-8;
          assert.ok(x >= design.margin - tolerance && x <= design.width - design.margin + tolerance);
          assert.ok(y >= design.margin - tolerance && y <= design.height - design.margin + tolerance);
        }
      }
    }
  }
});
