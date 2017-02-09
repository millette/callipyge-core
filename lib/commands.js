'use strict'

// core
const fs = require('fs')

// self
const pkg = require('../package.json')

module.exports = {
  help: () => {
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
    // const x = fs.readFileSync('.env') // , 'utf-8'
    // console.log(typeof x, x.length)
  }
}
