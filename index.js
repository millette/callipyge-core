'use strict';

const Hapi = require('hapi')
const Vision = require('vision')
const LodashVision = require('lodash-vision')

const server = new Hapi.Server()

server.register(Vision, (err) => {
  if (err) { throw err }
  server.views({
    engines: { html: LodashVision },
    path: 'templates',
    partialsPath: 'templates/partials',
    helpersPath: 'templates/helpers',
    isCached: false
  })

/*
  server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply.view('allo', { str: 'Hello, world!' })
    }
  })
*/
})


/*
server.connection({ port: 3000, host: 'localhost' })

server.start((err) => {
  if (err) { throw err }
  console.log(`Server running at: ${server.info.uri}`)
})
*/

module.exports = server
