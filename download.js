// Configuration

const headers = require('./config').headers;

// The folder in which to save the photos and data
// eg: `./my_data` uses (or creates) a 'my_data' folder in the current directory
const outputDir = require('./config').outputDir;

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

const downloadObservation = async (dir, observation_id) => {
  const body = {
    "operationName": "ObservationsByIds",
    "variables": { "observationIds": [observation_id] },
    "query": "query ObservationsByIds($observationIds: [ObservationId!]!) {\n  childDevelopment {\n    observations(first: 100, observationIds: $observationIds, ignoreMissing: true) {\n      results {\n        ...ObservationData\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ObservationData on Observation {\n  ...ObservationDataWithNoComments\n  comments {\n    count\n    results {\n      ...Comment\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment Comment on Comment {\n  behaviors {\n    id\n    __typename\n  }\n  body\n  id\n  likes {\n    count\n    likedByMe\n    likes {\n      ...Like\n      __typename\n    }\n    __typename\n  }\n  sentAt\n  sentBy {\n    name {\n      fullName\n      __typename\n    }\n    profileImage {\n      url\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment Like on Like {\n  likedAt\n  likedBy {\n    profileImage {\n      url\n      __typename\n    }\n    name {\n      firstName\n      fullName\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment ObservationDataWithNoComments on Observation {\n  children {\n    id\n    name\n    institutionId\n    __typename\n  }\n  id\n  version\n  feedItem {\n    id\n    __typename\n  }\n  createdBy {\n    name {\n      fullName\n      __typename\n    }\n    profileImage {\n      url\n      __typename\n    }\n    __typename\n  }\n  status {\n    state\n    createdAt\n    __typename\n  }\n  variant\n  settings {\n    assessmentSetting {\n      assessmentSettingsId\n      title\n      __typename\n    }\n    __typename\n  }\n  behaviors {\n    id\n    ... on BehaviorCanLinkToFrameworks {\n      ...BehaviorCanLinkToFrameworks\n      __typename\n    }\n    ... on BehaviorObservationVariantAmbiguity {\n      variants\n      __typename\n    }\n    __typename\n  }\n  remark {\n    id\n    body\n    richTextBody\n    date\n    statements {\n      refinement\n      statement {\n        body\n        id\n        area {\n          frameworkId\n          id\n          lower\n          upper\n          title\n          abbr\n          color\n          subAreas {\n            title\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    areas {\n      area {\n        frameworkId\n        id\n        parentId\n        title\n        description\n        abbr\n        color\n        placement\n        __typename\n      }\n      refinement\n      note\n      areaRefinementSettings {\n        ageBandSetting {\n          ...AgeBandSetting\n          __typename\n        }\n        assessmentOptionSetting {\n          ...AssessmentOptionSetting\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  nextStep {\n    id\n    body\n    richTextBody\n    __typename\n  }\n  files {\n    name\n    url\n    id\n    __typename\n  }\n  images {\n    height\n    width\n    id\n    secret {\n      crop\n      expires\n      key\n      path\n      prefix\n      __typename\n    }\n    __typename\n  }\n  video {\n    ... on TranscodingVideo {\n      id\n      __typename\n    }\n    ... on TranscodedVideo {\n      duration\n      height\n      id\n      thumbnailUrl\n      videoUrl\n      width\n      __typename\n    }\n    __typename\n  }\n  likes {\n    count\n    likedByMe\n    likes {\n      ...Like\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment BehaviorCanLinkToFrameworks on BehaviorCanLinkToFrameworks {\n  id\n  __typename\n  frameworks {\n    ...MinimalFramework\n    __typename\n  }\n}\n\nfragment MinimalFramework on Framework {\n  id\n  title\n  abbr\n  areas {\n    title\n    description\n    abbr\n    color\n    id\n    __typename\n  }\n  __typename\n}\n\nfragment AgeBandSetting on AgeBandSetting {\n  ageBandSettingId\n  id: ageBandSettingId\n  assessmentSettingsId\n  from\n  to\n  label\n  __typename\n}\n\nfragment AssessmentOptionSetting on AssessmentOptionSetting {\n  assessmentOptionSettingId\n  id: assessmentOptionSettingId\n  assessmentSettingsId\n  backgroundColor\n  fontColor\n  label\n  __typename\n}\n"
  };
  const resp = await fetch("https://app.famly.co/graphql", {
    "credentials": "include",
    "headers": headers,
    "referrer": "https://app.famly.co/",
    "body": JSON.stringify(body),
    "method": "POST",
    "mode": "cors"
  });
  const respJson = await resp.json();
  await downloadObservationData(dir, respJson);
  await writeTextFile(JSON.stringify(respJson), `${dir}/observation.json`)
}

const downloadObservationData = async (dir, observation_data) => {
  const observation_results = observation_data.data.childDevelopment.observations.results;
  if (observation_results.length === 1) {
    const obs = observation_results[0];
    const remark = obs.remark.body;
    writeTextFile(remark, `${dir}/observation_remark.txt`)
    obs.images.forEach(async (image) => {
      const image_url = `${image.secret.prefix}/${image.secret.key}/${image.width}x${image.height}/${image.secret.path}?expires=${image.secret.expires}`
      await downloadBlob(image_url, `${dir}/observation_image-${image.id}.jpg`)
    })
  } else {
    throw new Error(`Found ${observation_results.length} observations; expected one!`);
  }
}

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

const downloadEmbed = async (dir, embed) => {
  if (embed) {
    if (embed.type == 'Observation') {
      console.log('Downloading embedded observation')
      await downloadObservation(dir, embed.observationId)
    } else if (embed.type === 'Daycare.Invoice') {
      console.log(`Embed skipped: ${embed.type}`)
    } else {
      console.log('Embed:', embed)
      throw new Error(`Unhandled embed type: ${embed.type}`)
    }
  } else {
    console.log('No embed found')
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
  await downloadEmbed(dir, feedItem.embed);
  await downloadItemText(dir, feedItem);
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

