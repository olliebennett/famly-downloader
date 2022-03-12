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
const axios = require('axios').default;

let getPage = async (olderThan) => {
  // https://app.famly.co/api/feed/feed/feed?olderThan=2022-03-11T08%3A41%3A53%2B00%3A00
  const olderThanParam = olderThan ? `&olderThan=${encodeURIComponent(olderThan)}` : ''
  const url = `https://app.famly.co/api/feed/feed/feed?heightTarget=762${olderThanParam}`
  const resp = await fetch(url, {
    "credentials": "include",
    "headers": headers,
    "referrer": "https://app.famly.co/",
    "method": "GET",
    "mode": "cors"
  });

  // const resp = await axios.get(url, {
  //   headers: headers,
  //   referrer: "https://app.famly.co/",
  //   mode: "cors",
  //   credentials: 'include'
  // });

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
    if (err && err.code !== 'EEXIST') {
      throw err;
    }
    console.log(`Folder '${dirName}' created successfully`);
  });
}

const prettyDate = (dateStr) => { return dateStr.substring(0, 19).replaceAll(' ', 'T').replaceAll(':', '') }

const downloadImage = async (url, filepath) => {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  return new Promise((resolve, reject) => {
    response.data
            .pipe(fs.createWriteStream(filepath))
            .on('error', reject)
            .once('close', () => {
              console.log(`Wrote image: ${filepath}`);
              resolve(filepath)
            });
  });
}


const writeTextFile = async (data, filepath) => {
  fs.writeFile(filepath, data, err => {
    if (err) {
      console.error(err)
      return
    }
    console.log(`Wrote file: ${filepath}`);
  })
}

const handleResponse = (resp) => {
  console.log(`Found ${resp.feedItems.length} feed items before ${oldestCreatedAt}`);
  resp.feedItems.forEach((feedItem) => {
    const feedItemId = feedItem.feedItemId
    const feedItemDate = feedItem.createdDate;
    console.log(`feedItemId: ${feedItemId} - feedItemDate: ${feedItemDate}`)
    oldestCreatedAt = feedItemDate;
    if (!ignoredFeedItems.includes(feedItem.systemPostTypeClass)) {
      // console.log('feedItem', feedItem)
      const images = feedItem.images;
      // const comments = feedItem.comments;
      if (images && images.length > 0) {
        const feedItemDir = prettyDate(feedItemDate);
        mkdir(`${outputDir}/${feedItemDir}`);
        console.log(`Processing ${images.length} images:`)
        images.forEach(async (image) => {
          const filepath = `${prettyDate(image.createdAt.date)}-${image.imageId}.jpg`
          await downloadImage(image.big.url, `${outputDir}/${feedItemDir}/${filepath}`)
          // console.log(image)
          // console.log(` - ${image.big.width}x${image.big.height} - ${image.big.url}`);
        })
        const textOutput = `---\ndate: ${feedItemDate}\nsender: ${feedItem.sender.name}\nreceivers:\n  - ${feedItem.receivers.join('\n  - ')}\nlikes:\n  - ${feedItem.likes.map((x) => { return `${x.name} [${x.subtitle}]`}).join('\n  - ')}\n---\n\n${feedItem.body}`
        writeTextFile(textOutput, `${outputDir}/${feedItemDir}/details.txt`)
        writeTextFile(JSON.stringify(feedItem), `${outputDir}/${feedItemDir}/data.json`)
      }
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

