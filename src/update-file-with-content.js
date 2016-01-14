const { pick } = require('lodash')
const promisify = require('es6-promisify')

const defaultDefault = require('./default-default')

module.exports = async function (github, config) {
  const { contents, filenames, sha, author, comitter } = config
  const message = config.message || `chore: updated ${filenames.join(', ')}`

  const addRepo = defaultDefault(pick(config, ['user', 'repo']))

  try {
    const tree = await promisify(github.gitdata.createTree)(addRepo({
      base_tree: sha,
      tree: filenames.map((filename, index) => {
        return {
          path: filename,
          mode: '100644',
          type: 'blob',
          content: contents[index]
        }
      })
    }))

    const commit = await promisify(github.gitdata.createCommit)(addRepo({
      message,
      tree: tree.sha,
      parents: [sha],
      author,
      comitter
    }))

    return Promise.resolve(commit)
  } catch (err) {
    return Promise.reject(err)
  }
}
