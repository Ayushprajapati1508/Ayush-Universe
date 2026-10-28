# Ayush Universe

A personal universe for **Ayush Prajapati**: a website builder with a BCA background, now studying cybersecurity in semester 1. A central Ayush star connects the About, Learning, Journey and Contact destinations.

The site uses **HTML, CSS and JavaScript**, with **Three.js** for the animated universe. Three.js is included locally in `dist/vendor/`; no npm installation, build step, database or API key is needed to run the included website.

## Run on Windows

1. Extract the complete ZIP into a folder such as `D:\MyProjects\AyushUniverse`.
2. Make sure Python 3 is installed.
3. Double-click **START-WINDOWS.bat**.
4. Your browser opens **http://localhost:8000**. Keep the separate server window open while you use the site.
5. To stop it, press **Ctrl+C** in the server window.

The launcher first tries the Windows Python launcher (`py -3`), then `python`. If you see an error that port 8000 is already in use, close the earlier local server before starting another one.

## Run from a terminal

Open a terminal in this project folder and use either:

```bash
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

On Windows, this command also works when the Python launcher is installed:

```powershell
py -3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

If Node.js is installed, use the included dependency-free server instead:

```bash
node serve.mjs
```

Then open **http://localhost:8000**. Use a local web server rather than double-clicking `dist/index.html`; browser JavaScript modules need an HTTP address.

## Edit the portfolio

Open the extracted folder in VS Code or another text editor.

| File | Purpose |
| --- | --- |
| `dist/index.html` | Page structure and accessible navigation |
| `dist/profile.js` | Contact links and optional resume URL |
| `dist/universe.js` | Three.js galaxy, planets and movement |
| `dist/universe-fallback.js` | Animated Canvas galaxy for devices without WebGL |
| Other `.css` and `.js` files in `dist/` | Styling, responsive layout and page interactions |
| `dist/assets/logo.svg` | Custom AP Orbit Signature logo |
| `dist/assets/favicon.svg` | Matching browser-tab icon |
| `dist/vendor/` | Included Three.js files and associated license notices |
| `serve.mjs` | Local Node.js web server |
| `START-WINDOWS.bat` | Windows shortcut for running the Python local server |

### Add your contact links

Edit the fields in **`dist/profile.js`**:

- `email`: the email address you want to show publicly.
- `linkedin`: your full LinkedIn profile URL.
- `github`: your full GitHub profile URL.
- `resumeURL`: a URL or local file path for your resume, such as `./assets/ayush-resume.pdf`. Add the PDF to that folder too.

These fields start blank until you provide real details. Keep anything you do not want to share blank. The portfolio does not invent contact addresses, certificates, job experience or cybersecurity achievements.

Save your edits and refresh the browser. If an old copy remains visible, use **Ctrl+F5**. Changes to downloaded files do not automatically change a hosted version; upload or publish the updated files again.

## Motion and compatibility

- The universe supports pausing motion.
- The site respects the browser/system **reduced motion** preference.
- Small screens use a lighter scene and responsive layout.
- If WebGL is unavailable, the animated Canvas universe provides the same planet interactions. A simple constellation remains available if neither renderer can start.
- A modern browser with graphics acceleration gives the fullest 3D experience.

## Put it online

This is a static website. Upload the **contents of `dist/`**, preserving the assets and vendor folders, to a static web host. `index.html` must sit at the published root. Do not upload the entire outer project folder as the homepage directory unless your host is configured to serve `dist/`.

No database is required for this version. The site does not store visitor messages or run a contact-form backend. Email and social links can be enabled with your real details in `profile.js`.

## Source and assets

The ZIP contains editable source code and the custom SVG identity. Keep the license notices accompanying vendored third-party code. The original concept image is a design reference; the website renders its interactive universe with code.
