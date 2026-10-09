# Text Comparer

A free, browser-only code and text comparer. Paste two versions or open local files, press **Compare**, and see highlighted line and character differences. Both sides remain editable, with live comparison after the first click.

## Features

- Side-by-side Monaco editors with syntax coloring, line numbers, and change navigation.
- Automatic language detection with a shared manual override.
- Local UTF-8 file import, swap, clear, and preserved undo history when entering comparison.
- Whitespace-sensitive comparison and explicit results for identical text.
- System, light, and dark themes; accessible labeled controls and keyboard shortcuts.

Supported languages: Plain Text, JavaScript, TypeScript, C#, JSON, HTML, CSS, Python, Java, C/C++, SQL, Markdown, YAML, XML, and Shell. Detection uses recognized file extensions first, then local heuristics. Short or ambiguous snippets fall back to Plain Text; choose a language manually if needed.

## Usage and limits

1. Paste text into **Original** and **Modified**, or use **Open file** on each side.
2. Choose a language or leave **Auto-detect** selected.
3. Press **Compare** or **Ctrl/⌘ + Enter**. Edits now update the diff live.
4. Use the arrows to visit changed regions. **Swap** reverses the comparison; **Clear** starts over.

Each side supports up to **5 MiB** of UTF-8 text. Files must be UTF-8 (an optional BOM is accepted); binary and unreadable files are rejected without replacing existing text. Oversized pasted text remains in the editor, but comparison pauses until the input is reduced. Diff computation is capped at five seconds, with a visible incomplete-result message if it times out.

Whitespace, case, blank lines, and final-newline differences are significant. CRLF and CR line endings are normalized to LF, so this compares text rather than file bytes. There is no automatic formatting or trimming.

Desktop browsers are the supported target. The toolbar adapts to smaller windows, while preserving two editor panes. Monaco does not officially support mobile browsers.

## Privacy

Text, filenames, language detection, and diff computation stay in browser memory. There is no backend, analytics, content upload, remote language service, saved comparison, or share link. Refreshing or leaving the page discards your input. Only the color theme preference is saved in local storage.

All application assets, the bundled editor icon font, syntax grammars, and editor workers are local to the deployed site. Text uses system fonts. Opening the site downloads these static assets from the host; comparing text makes no content-bearing network requests. GitHub source links open GitHub only when clicked.

## Development

Requires Node.js **22.12+** and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, including `/text-comparer-app/`. Serve the app through HTTP(S), rather than opening `index.html` directly, so editor workers can run.

```sh
npm run check
npx playwright install chromium firefox
npm run test:e2e
npm run preview
```

The app uses React, TypeScript, Vite, Monaco Editor, highlight.js (detection only), and Lucide icons. Unit tests cover detection, imports, text preservation, and result safety. Playwright exercises the actual editor and comparison flows in Chromium and Firefox.

Browser tests serve the production build. Run `npm run build` before `npm run test:e2e` after changing source code (`npm run check` also builds it).

The build dependencies use the official Rollup and esbuild WebAssembly distributions via npm overrides. This avoids loading unsigned native bundler modules on Windows machines with application control enabled. No Defender exclusions are needed.

## GitHub Pages deployment

The intended public repository is `ComeGetMe61/text-comparer-app`. Set **Settings → Pages → Source** to **GitHub Actions**. The workflow checks pull requests; successful builds on `main` deploy `dist/` to Pages after unit and browser tests pass.

Vite's base is `/text-comparer-app/`, including application and worker assets. If renaming the repository, update the Vite base, test base URL, and source links together. No client-side route rewrites or custom domain are needed.

## License

[MIT](LICENSE)
