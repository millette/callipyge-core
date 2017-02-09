#!/usr/bin/env node

'use strict'

// self
const pkg = require('./package.json')
const commands = require('./lib/commands')
const cli = require('./lib/cli')

// npm
require('update-notifier')({ pkg }).notify()

if (process.argv.length < 3 || !commands[process.argv[2]]) {
  console.log('help go 1')
  commands.help()
  process.exit(0)
}

try {
  require('dotenv-safe').load({ sample: [__dirname, '.env.required'].join('/') })
  if (process.argv[3] === 'help') {
    process.argv[3] = process.argv[2]
    process.argv[2] = 'help'
  }
  console.log('cmd go 1')
  commands[process.argv[2]](process.argv.slice(3))
} catch (e) { cli.mainCatch(e) }
