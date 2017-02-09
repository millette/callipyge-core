'use strict'

try {
  // self
  const cli = require('./cli')
  module.exports = {
    version: cli.version,
    'create-db': cli.createDb,
    init: () => {
      console.log('init not implemented yet.')
    },
    help: (m) => {
      if (m && m[0] && module.exports[m[0]] && module.exports[m[0]].help) {
        module.exports[m[0]].help()
      }
      console.log(`
GENERAL USAGE
${cli.getVersion}

$ ${process.argv[1]} [command]

Where [command] is one of:
* ${Object.keys(module.exports).join('\n* ')}

You can also get help on any command with:
$ callipyge help [command]
or the equivalent
$ callipyge [command] help
`)
    }
  }

  module.exports['create-db'].help = () => {
    console.log(`==============
create-db help
==============
Interactive command to create the required database on cloudant,
defaulting to values in .env.
`)
  }

  module.exports.init.help = () => {
    console.log('init help')
  }
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    console.error(e.message)
    console.error(e)
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
