'use strict'

// npm
const Hapi = require('hapi')
const callipygeCloudant = require('callipyge-cloudant')

try {
  require('dotenv-safe').load({ sample: [__dirname, '.env.required'].join('/') })
} catch (e) {
  if (e.name !== 'MissingEnvVarsError') {
    console.error(e)
    process.exit(11)
  }

  console.error(`Missing environment variables:

* ${e.missing.join('\n* ')}

See ${e.sample} for details.
`)
  process.exit(10)
}

// self
const utils = require('./lib/utils')

const defaultHandler = function (request, reply) {
  reply({
    serverKeys: Object.keys(request.server),
    requestKeys: Object.keys(request),
    replyKeys: Object.keys(reply),
    serverInfo: request.server.info,
    pre: request.pre,
    params: request.params,
    query: request.query
  })
}

module.exports = (init) => {
  if (!init) { init = { } }
  const server = new Hapi.Server()
  if (!init.options) { init.options = {} }
  const options = init.options
  const host = options.host || process.env.CALLIPYGE_HOST || 'localhost'
  const port = options.port || process.env.CALLIPYGE_PORT || 6123

  const running = () => {
    console.log(`Core is running at: ${server.info.uri}`)
    return server
  }

  const fixRoute = (route) => {
    if (typeof route === 'function') { route = { handler: route } }
    if (typeof route === 'string') { route = { path: route, handler: init.options.defaultHandler || defaultHandler } }
    if (!route.method) { route.method = 'GET' }
    if (!route.path) { route.path = '/' }
    return route
  }

  try {
    utils.setupLodashVision(server, options.views)
    return server.register({
      register: callipygeCloudant,
      options: {
        username: process.env.CLOUDANT_USERNAME,
        password: process.env.CLOUDANT_PASSWORD,
        dbName: process.env.CLOUDANT_DATABASE
      }
    })
      .then(() => {
        server.connection({ port, host })
        if (!init.options.routes || !init.options.routes.length) {
          init.options.routes = ['/']
        }
        if (typeof init === 'function') {
          console.log(`Initializing...`)
          init(server)
        }
        console.log(`Adding ${init.options.routes.length} routes.`)
        server.route(init.options.routes.map(fixRoute))
        return server.start()
      })
      .then(running)
      .catch(console.error)
  } catch (e) { return Promise.reject(e) }
}
