'use strict'

try {
  // self
  const cli = require('./cli')
  module.exports = {
    version: cli.version,
    help: cli.help,
    'create-db': cli.createDb,
    init: () => {
      console.log('init', process.cwd())
    }
  }

  module.exports.init.help = () => {
    console.log('init help')
  }
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    console.error(e.message)
    process.exit(4)
  }
  console.error(`callipyge-core should be installed as a dependency of your project.

In your project's package.json file, add a "script" key like:

"script": {
  "callipyge": "callipyge"
}

and launch the callipyge cli with:

npm run callipyge
(or if you prefer)
yarn callipyge
`)
  process.exit(3)
}
