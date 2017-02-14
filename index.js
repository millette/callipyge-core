'use strict'

// npm
const Hapi = require('hapi')
const callipygeCloudant = require('callipyge-cloudant')
const joi = require('joi')
const lout = require('lout')
const inert = require('inert')
const hapiPassword = require('hapi-password')
const hapiCredentials = require('hapi-context-credentials')

// self
const pkg = require('./package.json')
const utils = require('./lib/utils')

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

const defaultHandler = function (request, reply) {
  // console.log(Object.keys(request))
  reply.view('default', {
    serverKeys: Object.keys(request.server),
    requestKeys: Object.keys(request),
    replyKeys: Object.keys(reply),
    serverInfo: request.server.info,
    pre: request.pre,
    params: request.params,
    query: request.query
  })
}

const optionsSchema = joi.object({
  cloudant: joi.object().keys({
    public: joi.string(),
    private: joi.string()
  }),
  lout: joi.object(),
  inert: joi.object(),
  views: joi.object(),
  port: joi.number().integer().positive(),
  host: joi.string().hostname(),
  defaultHandler: joi.func().arity(2),
  routes: joi.array()
})

module.exports = (init) => {
  if (!init) { init = { } }
  const server = new Hapi.Server()
  if (!init.options) { init.options = {} }
  if (!init.options.cloudant) { init.options.cloudant = {} }

  joi.assert(init.options, optionsSchema, 'Invalid options registering ' + pkg.name)
  const host = init.options.host || process.env.CALLIPYGE_HOST || 'localhost'
  const port = init.options.port || process.env.CALLIPYGE_PORT || 6123

  const running = () => {
    console.log(`Core is running at: ${server.info.uri}`)
    return server
  }

  const fixRoute = (route) => {
    if (typeof route === 'function') { route = { handler: route } }
    if (typeof route === 'string') { route = { path: route, handler: init.options.defaultHandler || defaultHandler } }
    if (!route.method) { route.method = 'GET' }
    if (!route.path) { route.path = '/' }
    if (route.path.slice(0, 1) !== '/') { route.path = '/' + route.path }
    return route
  }

  const register = () => {
    const authOptions = {
      mode: false,
      password: {}
    }

    authOptions.password[process.env.CLOUDANT_PASSWORD] = {
      name: process.env.CLOUDANT_USERNAME
    }

    return server.register([
      hapiCredentials,
      {
        register: hapiPassword,
        options: authOptions
      },
      {
        register: inert,
        options: init.options.inert
      },
      {
        register: lout,
        options: init.options.lout
      },
      {
        register: callipygeCloudant,
        options: {
          username: process.env.CLOUDANT_USERNAME,
          password: process.env.CLOUDANT_PASSWORD,
          dbName: process.env.CLOUDANT_DATABASE
        }
      }
    ])
  }

  const initialize = () => {
    const adminHandlers = function (tpl, ctx, request, reply) {
      ctx.adminMenu = { active: request.url.pathname }
      reply.view(tpl, ctx)
    }

    const newDocSchema = joi.object({
      _id: joi.string().allow(''),
      title: joi.string().required(),
      content: joi.string().allow('')
    })

    const adminHandler = adminHandlers.bind(this, 'admin', {})

    const newDocPost = function (request, reply) {
      console.log('Posting new doc...')
      reply('yes')
    }

    const adminNewDocHandler = function (request, reply) {
      if (request.method === 'post') {
        return reply({ what: 'Posting', payload: request.payload, so: request.pre.newDocPosted })
      }
      if (request.method === 'get') {
        return adminHandlers('newDoc', {
          formItems: [
            {
              label: 'Unique ID',
              name: '_id'
            },
            {
              label: 'Title',
              name: 'title',
              required: true
            },
            {
              label: 'Content',
              name: 'content',
              type: 'textarea'
            }
          ]
        }, request, reply)
      }
    }

    if (!init.options.routes || !init.options.routes.length) { init.options.routes = ['/'] }

    init.options.routes.push({
      // FIXME: should handle any http method but h2o2 complains
      // method: '*',
      path: ['', init.options.cloudant.public || 'public', '{cloudant*}'].join('/'),
      handler: { cloudant: false }
    })

    init.options.routes.push({
      // FIXME: should handle any http method but h2o2 complains
      // method: '*',
      path: ['', init.options.cloudant.private || 'private', '{cloudant*}'].join('/'),
      handler: { cloudant: { auth: true } }
    })

    init.options.routes.push({
      path: 'admin',
      config: {
        auth: {
          strategy: 'password',
          mode: 'required'
        }
      },
      handler: adminHandler
    })

    init.options.routes.push({
      path: 'admin/new/doc',
      config: {
        auth: {
          strategy: 'password',
          mode: 'required'
        }
      },
      handler: adminNewDocHandler
    })

    init.options.routes.push({
      method: 'post',
      path: 'admin/new/doc',
      config: {
        pre: [{ method: newDocPost, assign: 'newDocPosted' }],
        validate: { payload: newDocSchema },
        auth: {
          strategy: 'password',
          mode: 'required'
        }
      },
      handler: adminNewDocHandler
    })

    init.options.routes.push({
      path: 'admin/new',
      config: {
        auth: {
          strategy: 'password',
          mode: 'required'
        }
      },
      handler: function (request, reply) {
        reply.redirect('/admin/new/doc')
      }
    })

    init.options.routes.push({
      path: 'admin/new/',
      config: {
        auth: {
          strategy: 'password',
          mode: 'required'
        }
      },
      handler: function (request, reply) {
        reply.redirect('/admin/new/doc')
      }
    })

    if (typeof init === 'function') {
      console.log(`Initializing...`)
      init(server)
    }
    console.log(`Adding ${init.options.routes.length} routes.`)
    server.route(init.options.routes.map(fixRoute))
    return server.start()
  }

  try {
    server.connection({ port, host })
    return utils.setupLodashVision(server, init.options.views)
      .then(register)
      .then(initialize)
      .then(running)
  } catch (e) { return Promise.reject(e) }
}
