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
  help: (m) => {
    if (m && m[0] && module.exports[m[0]] && module.exports[m[0]].help) {
      module.exports[m[0]].help()
    }
    console.log(`
GENERAL USAGE
${nameVersion}

${process.argv[1]} [command]

Where [command] is one of:

* ${Object.keys(module.exports).join('\n* ')}

You can also get help on any command with:

callipyge help [command]

or the equivalent

callipyge [command] help
`)
  },
  version: () => console.log(nameVersion),
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
        name: 'dbname',
        default: appPkg.name
      }
    ]
    inquirer.prompt(prompts)
      .then((answers) => {
        if (!answers.password) { answers.password = process.env.CLOUDANT_PASSWORD }
        console.log(answers)
      })
  }
}
