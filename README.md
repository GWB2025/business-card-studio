# Business Card Studio

**[Launch Business Card Studio on GitHub Pages](https://gwb2025.github.io/business-card-studio/)**

Design an actual-size business card for a pen plotter. The editor starts with an **85 × 55 mm NFC card**, with single-line lettering on the left and a mathematical motif on the right. It runs entirely in the browser.

## Design and plot a card

1. Enter your name, a short description and any contact details. Choose one of the four Hershey stroke fonts.
2. Choose **Vortex**, **Waves** or **Orbit** for the right-hand design, or tick **Use a QR code instead of the motif** and enter a full website address.
3. Choose the card size, safe margin and pen width. Use **Download SVG** to export the drawing with its physical dimensions and all lettering converted to pen paths.
4. In SVG Plotter, choose the matching page size and **Keep original size and position**. Use **100% scale**.

On the default 85 × 55 mm stock, **TAP TO CONNECT** is centred over the 7.5 × 5 mm chip. Its centre is 20 mm from the left edge and 35 mm from the top of the landscape card. **Layout guides** shows the chip outline in the preview. Only the lettering and signal symbol are plotted there. For stock with a different chip position, clear **Centre the prompt on the NFC chip** to use the lower-left prompt.

For a round adhesive tag, tick **Plot placement marks for a 23 mm tag** under **Your details**. On an 85 × 55 mm card the raised tap row reads **TAP HERE**, followed by four short marks and the signal symbol. Each mark is about 1.2 mm long. Plot at 100% and line up the sticker’s top, bottom, left and right edges with the marks. You can edit the tap wording. Untick the option to return to the embedded-chip layout. On narrow cards the sticker row uses the full card width below the artwork.

Use **Save design** to keep an editable JSON copy. **Open design** restores it on another device or in another browser. Automatic drafts are stored separately for each browser and site address. To bring a draft across from the original ChatGPT site, save it there and open the JSON in this edition.

## Tap or scan

QR mode uses the right-hand panel of the card. The caption reads **OR SCAN** when the tap prompt is enabled and **SCAN** when it is switched off. The URL and QR setting are included when you save a design. Generating the code happens locally in your browser.

The card preview shows solid black squares on white. Choose **Scan QR on screen** for a larger code. The link beneath it opens the encoded address so you can check the destination before plotting.

The SVG uses the same grid. The pen draws one straight horizontal stroke at a time, lifting across gaps and before changing direction. Four blank modules surround the code. Set the pen width to the width your pen actually draws. For finer detail, use a shorter link, a finer pen or a wider card. On semi-clear stock, test one plot with a dark pen and a light backing. Programme the NFC tag separately with the same URL if you want both methods to open the same page.

## Run locally

From the repository directory, start a static web server. With Python 3 installed, run:

```sh
python3 -m http.server 8000
```

Then open [localhost:8000](http://localhost:8000/). The editor loads its bundled stroke fonts over HTTP. It requires no package installation or build step.

## Source and tests

The interface is in `index.html`, `style.css` and `app.js`. The geometry and SVG generator are in `card.js`. The stroke fonts are in `fonts.json`, with their accompanying [licence](FONT-LICENCE.txt).

The QR pen paths are generated in `qr.js`. The bundled encoder is [qrcode-generator 2.0.4 by Kazuhiko Arase](https://github.com/kazuhikoarase/qrcode-generator/tree/83b7e8fe3fddd3b0368dbafd6ce56995bd25e3c8), distributed under its [MIT licence](vendor/qrcode-LICENSE.txt).

Run the SVG export checks with Node.js 20 or later:

```sh
node --test tests/*.cjs
```

GitHub Pages publishes the root of the `main` branch.
