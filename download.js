// Configuration

// Copy your
const headers = require('./config').headers;

// The folder in which to save the photos and data
// eg: `./my_data` uses (or creates) a 'my_data' folder in the current directory
const outputDir = require('./config').outputDir;

// =================
// Do NOT edit below
// =================

console.log('Starting script...')

const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let getPage = async (olderThan) => {
  // https://app.famly.co/api/feed/feed/feed?olderThan=2022-03-11T08%3A41%3A53%2B00%3A00
  const olderThanParam = olderThan ? `&olderThan=${encodeURIComponent(olderThan)}` : ''
  const url = `https://app.famly.co/api/feed/feed/feed?heightTarget=9999${olderThanParam}`
  const resp = await fetch(url, {
    "credentials": "include",
    "headers": headers,
    "referrer": "https://app.famly.co/",
    "method": "GET",
    "mode": "cors"
  });

  if (!resp.ok) {
    const message = `Error from Famly: ${resp.status} - See README for troubleshooting tips`;
    throw new Error(message);
  }

  return await resp.json();
};

const ignoredFeedItems = ['Daycare.Checkin:CheckedOut', 'Daycare.Sleep:NapEnded']

var oldestCreatedAt = '2050-01-01T00:00:00+00:00'

const mkdir = (dirName) => {
  fs.mkdir(dirName, (err) => {
    if (err) {
      if (err.code === 'EEXIST') {
        console.log(`Folder '${dirName}' already exists`);
      } else {
        throw err;
      }
    } else {
      console.log(`Folder '${dirName}' created successfully`);
    }
  });
}

const prettyDate = (dateStr) => dateStr.substring(0, 19).replace(/ /, 'T').replace(/:/g, '');

// Name is the adult, subtitle is the child's name (and room in parentheses)
const formatName = (personData) => `${personData.name} [${personData.subtitle}]`;

const downloadBlob = async (url, filepath) => {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(filepath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", () => {
      console.log(`Wrote file: ${filepath}`);
      resolve()
    });
  });
};

const fileExists = (filepath) => fs.existsSync(filepath);

const writeTextFile = async (data, filepath) => {
  fs.writeFile(filepath, data, err => {
    if (err) {
      console.error(`Error while writing text file: ${filepath}`, err)
      return
    }
    console.log(`Wrote file: ${filepath}`);
  })
}

const downloadImages = async (dir, images) => {
  if (images && images.length > 0) {
    console.log(`Downloading ${images.length} images:`)
    images.forEach(async (image) => {
      const filepath = `${prettyDate(image.createdAt.date)}-${image.imageId}.jpg`
      await downloadBlob(image.big.url, `${dir}/${filepath}`)
    })
  } else {
    console.log('No images to download')
  }
}

const downloadFiles = async (dir, files) => {
  if (files && files.length > 0) {
    console.log(`Downloading ${files.length} files:`)
    files.forEach(async (file) => {
      const filepath = `${file.fileId}-${file.filename}`
      await downloadBlob(file.url, `${dir}/${filepath}`)
    })
  } else {
    console.log('No files to download')
  }
}

const commentsText = (comments) => {
  if (comments && comments.length > 0) {
    const commentsList = comments.map((comment) => {
      const commentDate = prettyDate(comment.createdDate);
      const textOutput = `---\ndate: ${commentDate}\nsender: ${formatName(comment.sender)}\nlikes:\n  - ${comment.likes.map(formatName).join('\n  - ')}\n---\n\n${comment.body}`
      return textOutput;
    })
    const commentsOutput = commentsList.join(`\n\n- - -\n\n`);
    return `Comments: \n\n${commentsOutput}`;
  } else {
    return 'Comments: none'
  }
}

const downloadItemText = async (dir, feedItem) => {
  const textOutput = `---\ndate: ${prettyDate(feedItem.createdDate)}\nsender: ${feedItem.sender.name}\nreceivers:\n  - ${feedItem.receivers.join('\n  - ')}\nlikes:\n  - ${feedItem.likes.map(formatName).join('\n  - ')}\n---\n\n${feedItem.body}\n\n\n\n${commentsText(feedItem.comments)}`
  await writeTextFile(textOutput, `${dir}/details.txt`)
  await writeTextFile(JSON.stringify(feedItem), `${dir}/data.json`)
}

const downloadItem = async (dir, feedItem) => {
  mkdir(dir);
  await downloadImages(dir, feedItem.images);
  await downloadFiles(dir, feedItem.files);
  await downloadItemText(dir, feedItem)
}

const handleResponse = (resp) => {
  console.log(`Processing ${resp.feedItems.length} feed items before ${oldestCreatedAt}`);
  resp.feedItems.forEach((feedItem) => {
    const feedItemId = feedItem.feedItemId
    const feedItemDate = feedItem.createdDate;
    const logPrefix = `feedItemId: ${feedItemId} - feedItemDate: ${feedItemDate}`
    oldestCreatedAt = feedItemDate;
    const feedItemDir = `${outputDir}/${prettyDate(feedItemDate)}`
    const alreadyProcessed = fileExists(`${feedItemDir}/data.json`)
    if (alreadyProcessed) {
      console.log(`${logPrefix} - already processed; skipping!`)
    } else if (ignoredFeedItems.includes(feedItem.systemPostTypeClass)) {
      console.log(`${logPrefix} - type ${feedItem.systemPostTypeClass}; skipping!`)
    } else {
      console.log(`${logPrefix} - processing...`)
      // Trigger (async) loading of the item.
      downloadItem(feedItemDir, feedItem)
    }
  });

  if (resp.feedItems.length > 0) {
    setTimeout(() => { getPage(oldestCreatedAt).then(handleResponse) }, 3000);
  } else {
    console.log('Finished');
  }
};

mkdir(outputDir);
getPage(oldestCreatedAt).then(handleResponse);

