'use strict'

// const npm
const Hapi = require('hapi')

// const self
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
  const server = new Hapi.Server()
  const options = init.options || {}
  const host = options.host || process.env.CALLIPYGE_HOST || 'localhost'
  const port = options.port || process.env.CALLIPYGE_PORT || 6123

  const running = () => {
    console.log(`Server running at: ${server.info.uri}`)
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
    server.connection({ port, host })
    if (init.options.routes && init.options.routes.length) {
      console.log(`Adding ${init.options.routes.length} routes.`)
      server.route(init.options.routes.map(fixRoute))
    }
    if (typeof init === 'function') { init(server) }
    return server.start().then(running)
  } catch (e) { return Promise.reject(e) }
}
