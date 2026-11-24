# Business Card Studio

**[Launch Business Card Studio on GitHub Pages](https://gwb2025.github.io/business-card-studio/)**

Design an actual-size business card for a pen plotter. The editor starts with an **85 × 55 mm NFC card**, with single-line lettering on the left and a mathematical motif on the right. It runs entirely in the browser.

## Design and plot a card

1. Enter your name, a short description and any contact details. Choose one of the four Hershey stroke fonts.
2. Choose **Vortex**, **Waves** or **Orbit**. Adjust the number of curves and the twist while watching the preview.
3. Choose the card size, safe margin and pen width. Use **Download SVG** to export the drawing with its physical dimensions and all lettering converted to pen paths.
4. In SVG Plotter, choose the matching page size and **Keep original size and position**. Use **100% scale**.

On the default 85 × 55 mm stock, **TAP TO CONNECT** is centred over the 7.5 × 5 mm chip. Its centre is 20 mm from the left edge and 35 mm from the top of the landscape card. **Layout guides** shows the chip outline in the preview. Only the lettering and signal symbol are plotted there. For stock with a different chip position, clear **Centre the prompt on the NFC chip** to use the lower-left prompt.

Use **Save design** to keep an editable JSON copy. **Open design** restores it on another device or in another browser. Automatic drafts are stored separately for each browser and site address. To bring a draft across from the original ChatGPT site, save it there and open the JSON in this edition.

## Run locally

From the repository directory, start a static web server. With Python 3 installed, run:

```sh
python3 -m http.server 8000
```

Then open [localhost:8000](http://localhost:8000/). The editor loads its bundled stroke fonts over HTTP. It requires no package installation or build step.

## Source and tests

The interface is in `index.html`, `style.css` and `app.js`. The geometry and SVG generator are in `card.js`. The stroke fonts are in `fonts.json`, with their accompanying [licence](FONT-LICENCE.txt).

Run the SVG export checks with Node.js 20 or later:

```sh
node --test tests/card.test.cjs
```

GitHub Pages publishes the root of the `main` branch.
