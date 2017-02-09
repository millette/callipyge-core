#!/usr/bin/env node

'use strict'

// core
const fs = require('fs')
const childProcess = require('child_process')

// self
const pkg = require('./package.json')
const commands = require('./lib/commands')

// npm
const updateNotifier = require('update-notifier')
const inquirer = require('inquirer')

updateNotifier({ pkg }).notify()

if (!process.argv[2] || !commands[process.argv[2]]) { commands.help() }

try {
  const z = require('dotenv-safe').load({ sample: [__dirname, '.env.required'].join('/') })
  console.log('Z:', z)
  commands[process.argv[2]]()
}
catch (e) {
  if (e.name === 'MissingEnvVarsError') {
    console.error(
`Missing environment variables:

* ${e.missing.join('\n* ')}

See ${e.sample} for details.
`)

    const envFile = (answers) => {
      let r
      if (!answers.envfile) {
        answers.envfile = ''
        for (r in answers.missing) {
          if (answers.missing[r].trim()) {
            answers.envfile += `${r.trim()}=${answers.missing[r].trim()}\n`
          }
        }
      }
      if (answers.envfile) { fs.writeFileSync('.env', answers.envfile) }
    }

    const prompts = fs.existsSync('.env')
      ? [{
        type: 'editor',
        message: 'Edit current file with appended missing variables.',
        name: 'envfile',
        default: fs.readFileSync('.env', 'utf8') + e.missing.map((x) => x + '=\n').join('')
      }]
      : e.missing.map((missing) => {
        return {
          type: missing.toLowerCase().indexOf('password') === -1 ? 'input' : 'password',
          name: `missing.${missing}`,
          message: `Value for ${missing} environment variable.`
        }
      })

    inquirer.prompt(prompts).then(envFile)
  } else {
    console.error(e)
  }
}
