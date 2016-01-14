const { defaults, includes, pick } = require('lodash')
const promisify = require('es6-promisify')
const defaultDefault = require('./default-default')

module.exports = async function contentFromFilename (github, config) {
  config = defaults(config, {
    branch: 'master'
  })

  const { branch, filenames } = config

  const addRepo = defaultDefault(pick(config, ['user', 'repo']))

  try {
    const head = await promisify(github.gitdata.getReference)(addRepo({ref: `heads/${branch}`}))

    const { tree } = await promisify(github.gitdata.getTree)(addRepo({sha: head.object.sha}))

    const shas = tree
    .filter((object) => includes(filenames, object.path))
    .map((object) => object.sha)

    // if (!shas.length) return Promise.reject(new Error(`Couldn't find ${filenames.join(', ')}.`))

    let blobs = await Promise.all(shas.map((sha) => promisify(github.gitdata.getBlob)(addRepo({sha}))))

    blobs = blobs.map((blob) => (new Buffer(blob.content, 'base64')).toString())

    return Promise.resolve({
      contents: blobs,
      commit: head.object.sha
    })
  } catch (err) {
    return Promise.reject(err)
  }
}
