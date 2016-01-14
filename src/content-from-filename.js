const { defaults, indexOf, pick } = require('lodash')
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

    let shas = []

    tree.forEach((object) => {
      var index = indexOf(filenames, object.path)
      if (!~index) return

      shas[index] = object.sha
    })

    // if (!shas.length) return Promise.reject(new Error(`Couldn't find ${filenames.join(', ')}.`))

    let blobs = await Promise.all(shas.map((sha) => sha ? promisify(github.gitdata.getBlob)(addRepo({sha})) : null))

    blobs = blobs.map((blob) => blob && blob.content ? (new Buffer(blob.content, 'base64')).toString() : null)

    return Promise.resolve({
      contents: blobs,
      commit: head.object.sha
    })
  } catch (err) {
    return Promise.reject(err)
  }
}
