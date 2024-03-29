# Famly.co Photo / Post Downloader

This script fetches all images and descriptions from any posts shared with you in your [Famly](https://www.famly.co/) childcare account.

## Requirements

You'll need [Node.js](https://nodejs.org/en/) installed; this runs in the terminal (not in your browser).

## Setup

- Install dependencies; `npm install`

The script needs your current login session / auth from your browser to authenticate.

- Copy/rename the `config.example.js` file to `config.js`.
- Open the [Famly app](https://app.famly.co/#/account/feed) in your browser.
- Open the browser's Developer Console (eg. right click anywhere and click 'Inspect').
- Open the 'Network' tab and refresh the page.
- Right click on any XHR request and click 'Copy' > 'Copy as fetch'
- Paste that, but copy only the `headers` section into the `config.js` file and save it.

Now you can run the download!

```sh
node download.js
```

## Troubleshooting

- `Error from Famly: 403` - update the `headers` in your config using the latest from a logged-in Famly session in your browser.

- `Error: Cannot find module './config'` - you need to rename the `config.example.js` file to `config.js` (and fill it in with your access details as described above).

## Alternatives

| Repo | Language | Notes |
| --- | --- | --- |
| [jacobbunk/famly-fetch](https://github.com/jacobbunk/famly-fetch) | Python | ? |
| [afrojun/famly-media-downloader](https://github.com/afrojun/famly-media-downloader) | Ruby | ? |
| [aarislarsen/FamlyDownloader](https://github.com/aarislarsen/FamlyDownloader) | PowerShell | ? |
