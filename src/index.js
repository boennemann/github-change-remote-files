require('babel-core/polyfill')

const { clone, defaults } = require('lodash')
const GitHubApi = require('github')
const promisify = require('es6-promisify')

const contentFromFilename = require('./content-from-filename')
const updateFileWithContent = require('./update-file-with-content')

module.exports = async function (config, callback) {
  config = clone(config, true)

  const {
    branch = 'master',
    token,
    transforms,
    filenames
  } = config

  try {
    let github = config.github

    if (!github) {
      github = new GitHubApi({
        version: '3.0.0'
      })

      github.authenticate({type: 'oauth', token})
    }

    const contents = await contentFromFilename(github, config)
    const newContents = transforms.map((transform, index) => transform(contents.contents[index], filenames[index]))

    config = defaults({contents: newContents, sha: contents.commit}, config)

    const commit = await updateFileWithContent(github, config)

    const {
      push,
      pr,
      newBranch
    } = config

    if (!(pr || push || newBranch)) return callback(null, commit)

    if (push) {
      return github.gitdata.updateReference(
        defaults({
          ref: `refs/heads/${branch}`,
          sha: commit.sha
        }, config),
        callback
      )
    }

    if (newBranch) {
      await promisify(github.gitdata.createReference)(defaults({
        sha: commit.sha,
        ref: `refs/heads/${newBranch}`
      }, config))
    }

    if (!pr) return callback(null, {commit})

    github.pullRequests.create(defaults(pr, config, {
      base: branch,
      head: config.newBranch || commit.sha
    }), callback)
  } catch (err) {
    callback(err)
  }
}
