'use strict'

try {
  // self
  const cli = require('./cli')
  module.exports = {
    version: cli.version,
    'ddocs': cli.ddocs,
    'create-db': cli.createDb,
    init: cli.init,
    /*
    () => {
      console.log('init not implemented yet.')
    },
    */
    help: (m) => {
      if (m && m[0] && module.exports[m[0]] && typeof module.exports[m[0]].help === 'function') {
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

Finally, you can get all the help at once with:
$ callipyge help --all
`)
      if (m && m[0] === '--all') {
        Object.keys(module.exports)
          .filter((x) => typeof module.exports[x].help === 'function')
          .forEach((x) => module.exports[x].help())
      }
      return Promise.resolve()
    }
  }

  module.exports['ddocs'].help = () => {
    console.log(`==============
ddocs help
==============
Interactive command to create or update the required design docs
and indexes, defaulting to values in .env.
`)
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
