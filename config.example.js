// THIS FILE MUST BE COPIED / RENAMED TO `config.js` before editing

module.exports = {
  // Header / Auth details copied from your browser session
  // (see README for details).
  headers: {
    "User-Agent": "...",
    "Accept": "*/*",
    "Accept-Language": "en-GB",
    "content-type": "application/json",
    "x-famly-accesstoken": "...",
    "x-famly-installationid": "...",
    "x-famly-platform": "html",
    "x-famly-request-uuid": "...",
    "x-famly-version": "...",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
  },
  // The folder in which to save the photos and data
  // eg: `./my_data` uses (or creates) a 'my_data' folder in the current directory
  outputDir: './output'
};