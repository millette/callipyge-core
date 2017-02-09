'use strict'

// core
const fs = require('fs')

// self
const pkg = require('../package.json')

module.exports = {
  version: () => console.log(pkg.name, pkg.version),
  help: (m) => {
    if (m && m[0] && module.exports[m[0]] && module.exports[m[0]].help) {
      module.exports[m[0]].help()
      process.exit(0)
    }
    console.log(`USAGE
${pkg.name} ${pkg.version}

${process.argv[1]} [command]

Where [command] is one of:

* ${Object.keys(module.exports).join('\n* ')}
`)
    process.exit(0)
  },
  createdb: () => {
    console.log('cdb', process.cwd())
  },
  init: () => {
    console.log('init', process.cwd())
  }
}

module.exports.init.help = () => {
  console.log('init help')
}
