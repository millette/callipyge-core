'use strict'

// self
const pkg = require('../package.json')
const nameVersion = `${pkg.name} (cli) ${pkg.version}`

// parent
const appPkg = require([process.cwd(), 'package.json'].join('/'))

// core
const fs = require('fs')

// npm
const inquirer = require('inquirer')
const got = require('got')

module.exports = {
  mainCatch: (e) => {
    if (e.name === 'MissingEnvVarsError') {
      console.error(`Missing environment variables:

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
      process.exit(2)
    }
  },
  version: () => {
    console.log(nameVersion)
    return nameVersion
  },
  createDb: () => {
    const prompts = [
      {
        type: 'input',
        message: 'Username',
        name: 'username',
        default: process.env.CLOUDANT_USERNAME
      },
      {
        type: 'password',
        message: 'Password (leave empty to use default)',
        name: 'password'
      },
      {
        type: 'input',
        message: 'Database name',
        name: 'dbName',
        default: process.env.CLOUDANT_DATABASE || appPkg.name
      }
    ]
    inquirer.prompt(prompts)
      .then((answers) => {
        if (!answers.password) { answers.password = process.env.CLOUDANT_PASSWORD }
        return Promise.all([answers, got.put(
          `https://${answers.username}.cloudant.com/${answers.dbName}`,
          { json: true, auth: [answers.username, answers.password].join(':') }
        )])
      })
      .then((x) => {
        console.log(`Created ${x[0].dbName} database.`)
        return Promise.all([x[0], inquirer.prompt([{
          type: 'confirm',
          name: 'updateEnv',
          message: 'Update .env file with previous answers.',
          default: true
        }])])
      })
      .then((x) => {
        if (x[1].updateEnv) {
          fs.writeFileSync('.env', `CLOUDANT_USERNAME=${x[0].username}
CLOUDANT_PASSWORD=${x[0].password}
CLOUDANT_DATABASE=${x[0].dbName}
`)
          console.log('Updated .env file with previous answers.')
        }
      })
      .catch((err) => {
        switch (err.statusCode) {
          case 412:
            console.error(err.statusMessage)
            console.error(`Verify that ${err.path} doesn't already exist on ${err.host}.`)
            break

          case 401:
          case 503:
            console.error(err.statusMessage)
            console.error(`Verify that you have the proper credentials to create ${err.path} on ${err.host}.`)
            break

          default:
            console.error('Unknown error:', err)
        }
      })
  }
}
