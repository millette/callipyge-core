'use strict'

// self
const pkg = require('../package.json')
const nameVersion = `${pkg.name} (cli) ${pkg.version}`

// parent
const appPkg = require([process.cwd(), 'package.json'].join('/'))

// core
const fs = require('fs')
const spawn = require('child_process').spawnSync
const path = require('path')
const url = require('url')

// npm
const inquirer = require('inquirer')
const got = require('got')
const glob = require('glob')
const callipygeCloudant = require('callipyge-cloudant')

const dbUrl = (auth) => {
  if (!process.env.CLOUDANT_DATABASE) {
    throw new Error('Missing CLOUDANT_DATABASE env variable.')
  }
  const urlObject = url.parse(`https://${process.env.CLOUDANT_USERNAME}.cloudant.com/${process.env.CLOUDANT_DATABASE}/`)
  if (auth) { urlObject.auth = [process.env.CLOUDANT_USERNAME, process.env.CLOUDANT_PASSWORD].join(':') }
  return urlObject
}

const cloudantCreateIndex = callipygeCloudant.cloudantCreateIndex.bind(this, dbUrl)
// const cloudantPost = callipygeCloudant.cloudantPost.bind(this, dbUrl)

const cloudantPost = (doc, auth) => callipygeCloudant.cloudantPost(dbUrl, doc, auth)
  .then((x) => x.statusCode === 409 ? Promise.reject(x) : x)

const confirm = (name, message) => {
  const type = 'confirm'
  return { type, name, message, default: true }
}

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

      inquirer.prompt(prompts)
        .then(envFile)
        .catch((e) => {
          console.error(e)
          process.exit(32)
        })
    } else {
      console.error(e)
      process.exit(2)
    }
  },
  getVersion: nameVersion,
  version: () => {
    console.log(nameVersion)
    return Promise.resolve(nameVersion)
  },
  init: () => {
    const prompts = []

    if (!fs.existsSync('.gitignore')) {
      prompts.push(confirm('gitignore', 'Create .gitignore file.'))
    }

    if (!fs.existsSync('.git')) {
      prompts.push(confirm('git', 'Initialize git and make initial commit.'))
    }

    if (!appPkg.scripts || !appPkg.scripts.start) {
      prompts.push(confirm('startScript', 'Add start script to package.json.'))
    }
    if (!appPkg.scripts || !appPkg.scripts.callipyge) {
      prompts.push(confirm('callipygeScript', 'Add callipyge script to package.json.'))
    }
    if (!appPkg.scripts || !appPkg.scripts.now) {
      prompts.push(confirm('nowScript', 'Add now script to package.json.'))
    }
    if (!appPkg.scripts || !appPkg.scripts.sass) {
      prompts.push(confirm('sassScript', 'Add sass script to package.json.'))
    }

    if (!appPkg.dependencies || !appPkg.dependencies['callipyge-core']) {
      prompts.push(confirm('dependency', 'Add callipyge dependency to package.json.'))
    }

    prompts.push(confirm('template', 'Create template directories and necessary symbolic links.'))

    if (!fs.existsSync('index.js')) {
      prompts.push(confirm('index', 'Create initial index.js file.'))
    }

    prompts.push(confirm('createDb', 'Create database.'))

    return inquirer.prompt(prompts)
      .then((answers) => {
        if (answers.gitignore) {
          fs.writeFileSync('.gitignore', `.env
node_modules
`)
        }

        if (answers.startScript || answers.callipygeScript || answers.nowScript || answers.sassScript || answers.dependency) {
          if (answers.startScript || answers.callipygeScript || answers.nowScript || answers.sassScript) {
            if (!appPkg.scripts) { appPkg.scripts = {} }
            if (answers.startScript) { appPkg.scripts.start = 'node index' }
            if (answers.callipygeScript) { appPkg.scripts.callipyge = 'callipyge' }
            if (answers.nowScript) { appPkg.scripts.now = 'now-deploy' }
            if (answers.sassScript) {
              appPkg.scripts.sass = 'sass'
              if (!fs.existsSync('scss')) { fs.mkdirSync('scss') }
              if (!fs.existsSync('scss/_settings.scss')) {
                fs.symlinkSync(
                  '../node_modules/callipyge-core/scss/_settings.scss',
                  'scss/_settings.scss'
                )
              }

              if (!fs.existsSync('scss/style.scss')) {
                fs.symlinkSync(
                  '../node_modules/callipyge-core/scss/style.scss',
                  'scss/style.scss'
                )
              }

              if (!fs.existsSync('public')) { fs.mkdirSync('public') }
              if (!fs.existsSync('public/js')) { fs.mkdirSync('public/js') }
              if (!fs.existsSync('public/js/vendor')) { fs.mkdirSync('public/js/vendor') }

              if (!fs.existsSync('public/js/vendor/foundation.min.js')) {
                fs.symlinkSync(
                  '../../../node_modules/foundation-sites/dist/js/foundation.min.js',
                  'public/js/vendor/foundation.min.js'
                )
              }

              if (!fs.existsSync('public/js/vendor/jquery.min.js')) {
                fs.symlinkSync(
                  '../../../node_modules/foundation-sites/vendor/jquery/dist/jquery.min.js',
                  'public/js/vendor/jquery.min.js'
                )
              }
            }
          }
          if (answers.dependency) {
            if (!appPkg.dependencies) { appPkg.dependencies = {} }
            appPkg.dependencies['callipyge-core'] = '*'
          }
          if (!appPkg.engines) { appPkg.engines = { node: '>=6' } }
          fs.writeFileSync('package.json', JSON.stringify(appPkg, null, '  ') + '\n')
        }

        if (answers.index) {
          fs.writeFileSync('index.js', `'use strict'

// npm
const callipyge = require('callipyge-core')

callipyge()
  .then((server) => console.log(\`App running at: \${server.info.uri}\`))
  .catch(console.error)
`)
        }

        if (answers.template) {
          if (!fs.existsSync('templates')) { fs.mkdirSync('templates') }
          glob.sync('node_modules/callipyge-core/templates/*.html', { nodir: true })
            .forEach((t) => {
              const b = 'templates/' + path.basename(t)
              if (!fs.existsSync(b)) { fs.symlinkSync('../' + t, b) }
            })

          if (!fs.existsSync('templates/partials')) { fs.mkdirSync('templates/partials') }
          glob.sync('node_modules/callipyge-core/templates/partials/*.html', { nodir: true })
            .forEach((t) => {
              const b = 'templates/partials/' + path.basename(t)
              if (!fs.existsSync(b)) { fs.symlinkSync('../../' + t, b) }
            })
        }

        if (answers.git) {
          if (!fs.existsSync('.git')) {
            spawn('git', ['init'])
            spawn('git', ['add', '.'])
            spawn('git', ['commit', '-mInitial commit.'])
          }
        }

        if (!answers.createDb) { return true }
        return module.exports.createDb()
      })
      .then((x) => {
        if (x) { console.log('Don\'t forget to run the create-db command if you haven\'t yet.') }
        return x
      })
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
    return inquirer.prompt(prompts)
      .then((answers) => {
        if (!answers.password) { answers.password = process.env.CLOUDANT_PASSWORD }
        return Promise.all([answers, got.put(
          `https://${answers.username}.cloudant.com/${answers.dbName}`,
          { json: true, auth: [answers.username, answers.password].join(':') }
        )])
      })
      .then((x) => {
        console.log(`Created ${x[0].dbName} database.`)
        return Promise.all([x[0], inquirer.prompt([
          confirm('updateEnv', 'Update .env file with previous answers.')
        ])])
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
      .then(() => { console.log('All done.') })
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
  },
  ddocs: () => {
    const index = {
      index: { fields: [{ name: 'tags.[].key', type: 'string' }] },
      type: 'text'
    }

    const doc = {
      _id: '_design/tags',
      views: {
        tags: {
          map: `function (doc) {
  if (!doc.tags || !doc.tags.length) { return }
  doc.tags.forEach(function (tag) {
    emit([tag.key, tag.text])
  })
}`,
          reduce: '_count'
        }
      }
    }

    return Promise.all([
      cloudantCreateIndex(index, true),
      cloudantPost(doc, true)
    ])
      .then((xx) => {
        console.log('Creating index:', xx[0])
        console.log('Creating ddoc:', xx[1])
      })
  }
}
