'use strict'

// npm
const _ = require('lodash')
const Hapi = require('hapi')
const callipygeCloudant = require('callipyge-cloudant')
const joi = require('joi')
const lout = require('lout')
const inert = require('inert')
const hapiPassword = require('hapi-password')
const hapiCredentials = require('hapi-context-credentials')
const hapiError = require('hapi-error')
const ColorHash = require('color-hash')

// self
const pkg = require('./package.json')
const utils = require('./lib/utils')

const colorHash = new ColorHash()

const tagColor = (tag) => {
  tag.color = colorHash.hex(tag.key)
  return tag
}

const findToTags = (rows) => {
  const objs = []

  _.each(_.groupBy(rows, (x) => x.key[0]), (v, k) => {
    objs.push(tagColor({
      key: k,
      url: '/tag/' + k,
      text: v.map((x) => `${x.key[1]} (${x.value})`).join(', ')
    }))
  })
  return objs
}

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

const transform = (doc) => {
  if (!doc.tags) { return doc }
  doc.tagsString = doc.tags
    .map((tag) => tag.text)
    .join(', ')
  return doc
}

const defaultHandler = function (request, reply) {
  if (!request.query.debug) { return reply.view('default') }

  const obj = {
    serverKeys: Object.keys(request.server),
    requestKeys: Object.keys(request),
    replyKeys: Object.keys(reply),
    serverInfo: request.server.info,
    pre: request.pre,
    params: request.params,
    query: request.query
  }
  reply.view('default', obj)
}

const optionsSchema = joi.object({
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

  if (!init.options.lout) {
    init.options.lout = {
      auth: {
        strategy: 'password',
        mode: 'required'
      }
    }
  }

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
        register: hapiError,
        options: { templateName: 'error' }
      },
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
          transform: transform,
          username: process.env.CLOUDANT_USERNAME,
          password: process.env.CLOUDANT_PASSWORD,
          dbName: process.env.CLOUDANT_DATABASE
        }
      }
    ])
  }

  const initialize = () => {
    const adminHandlers = function (tpl, ctx, request, reply) {
      if (request.params.tag) {
        ctx.adminMenu = { active: '/admin/content' }
      } else {
        ctx.adminMenu = { active: request.url.pathname }
      }
      reply.view(tpl, ctx)
    }

    const newDocSchema = joi.object({
      _id: joi.string().allow(''),
      action: joi.string().required(),
      title: joi.string().required(),
      tags: joi.string().allow(''),
      content: joi.string().allow('')
    })

    const docSchema = joi.object({
      _rev: joi.string().required(),
      _id: joi.string().required(),
      action: joi.string().required(),
      title: joi.string().required(),
      tags: joi.string().allow(''),
      content: joi.string().allow('')
    })

    const adminContentHandler = function (request, reply) {
      if (request.pre.tagDocs) {
        request.pre.tagDocs.tag = request.params.tag
        request.pre.docs = request.pre.tagDocs.docs
      }
      if (request.pre.docs && request.pre.docs.length) {
        request.pre.docs = request.pre.docs
          .map((doc) => {
            if (doc.tags) { doc.tags = doc.tags.map(tagColor) }
            return doc
          })
      }
      return adminHandlers('allDocs', { pre: request.pre }, request, reply)
    }

    const adminHandler = adminHandlers.bind(this, 'admin', {})

    const newDocPost = function (request, reply) {
      if (request.payload.action === 'copy') {
        reply({ copy: request.payload._id })
      } else if (request.payload.action === 'delete') {
        console.log('must implement delete')
        reply({ 'delete': request.payload._id })
      } else {
        if (!request.payload._id) {
          request.payload._id = utils.slug(request.payload.title)
        }
        if (request.payload.tags) {
          request.payload.tags = request.payload.tags
            .split(',')
            .map((x) => x.trim())
            .filter((x) => x)
            .map((x) => {
              return {
                key: utils.slug(x),
                text: x
              }
            })
        }
        delete request.payload.action
        request.payload.updatedAt = new Date().toISOString()
        request.payload.createdAt = request.pre.doc && request.pre.doc.createdAt || request.payload.updatedAt
        reply(server.methods.cloudant.post(request.payload, true))
      }
    }

    const adminNewDocHandler = function (request, reply) {
      if (request.method === 'post') {
        if (request.pre.newDocPosted.id) {
          return reply.redirect(['', 'doc', request.pre.newDocPosted.id].join('/'))
        }

        if (request.pre.newDocPosted.copy) {
          return reply.redirect('/admin/new/doc?from=' + request.pre.newDocPosted.copy)
        }

        if (request.pre.newDocPosted.delete) {
          return reply.redirect(['', 'admin', 'delete', request.pre.newDocPosted.delete].join('/'))
        }
      }
      if (request.method === 'get') {
        const context = {}
        const formItems = [
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
            label: 'Tags',
            name: 'tags'
          },
          {
            label: 'Content',
            name: 'content',
            type: 'textarea'
          }
        ]

        if (request.pre.doc) {
          if (request.pre.doc._rev) {
            context.edit = true
            formItems.push({
              name: '_rev',
              type: 'hidden'
            })
          }

          formItems.map((item) => {
            if (item.name === 'tags') {
              item.value = request.pre.doc.tagsString
              return item
            }
            if (request.pre.doc[item.name] !== undefined) {
              item.value = request.pre.doc[item.name]
            }
            return item
          })
        }

        context.formItems = formItems
        return adminHandlers('newDoc', context, request, reply)
      }
    }

    const auth = {
      strategy: 'password',
      mode: 'required'
    }

    const getTagDocs = function (request, reply) {
      reply(server.methods.cloudant.find({ selector: { tags: { $elemMatch: { key: request.params.tag || 'sys-fp' } } } }, true))
    }

    if (!init.options.routes || !init.options.routes.length) {
      init.options.routes = [{
        path: '/',
        handler: function (request, reply) {
          reply(server.inject({ url: '/tag' }).then((x) => x.result))
        }
      }]
    }

    init.options.routes.push({
      path: 'tag/{tag?}',
      config: {
        pre: [{ method: getTagDocs, assign: 'tagDocs' }]
      },
      handler: adminContentHandler
    })

    init.options.routes.push({
      path: 'assets/{path*}',
      handler: {
        directory: {
          index: false,
          lookupCompressed: true,
          etagMethod: 'simple',
          path: [
            [process.cwd(), 'public'].join('/'),
            [__dirname, 'public'].join('/')
          ]
        }
      }
    })

    init.options.routes.push({
      path: 'doc/{docid}',
      config: {
        pre: [{ method: server.methods.cloudant.getDoc, assign: 'doc' }]
      },
      handler: function (request, reply) {
        if (request.pre.doc && request.pre.doc.tags) {
          request.pre.doc.tags = request.pre.doc.tags.map(tagColor)
        }
        reply.view('doc', { pre: request.pre })
      }
    })

    const tagsHandler = function (request, reply) {
      request.server.inject({ allowInternals: true, url: '/cloudant.private/_design/tags/_view/tags?group_level=2' })
        .then((a) => {
          if (a.statusCode <= 100 || a.statusCode >= 400) {
            return reply(boom.create(a.statusCode, a.result.reason, a.result))
          }
          reply.view('tags', { rows: findToTags(a.result.rows) })
        })
    }

    init.options.routes.push({
      path: 'tags',
      handler: tagsHandler
    })

    init.options.routes.push({
      path: 'admin',
      config: { auth },
      handler: adminHandler
    })

    init.options.routes.push({
      path: 'admin/content',
      config: {
        auth: auth,
        pre: [{ method: server.methods.cloudant.getAllDocs, assign: 'docs' }]
      },
      handler: adminContentHandler
    })

    init.options.routes.push({
      path: 'admin/content/{tag}',
      config: {
        auth: auth,
        pre: [{ method: getTagDocs, assign: 'tagDocs' }]
      },
      handler: adminContentHandler
    })

    init.options.routes.push({
      path: 'admin/new/doc',
      config: {
        pre: [{ method: server.methods.cloudant.getDoc, assign: 'doc' }],
        auth: auth
      },
      handler: adminNewDocHandler
    })

    init.options.routes.push({
      method: 'post',
      path: 'admin/new/doc',
      config: {
        pre: [{ method: newDocPost, assign: 'newDocPosted' }],
        validate: { payload: newDocSchema },
        auth: auth
      },
      handler: adminNewDocHandler
    })

    init.options.routes.push({
      path: 'admin/edit/{docid}',
      config: {
        pre: [{ method: server.methods.cloudant.getDoc, assign: 'doc' }],
        auth: auth
      },
      handler: adminNewDocHandler
    })

    init.options.routes.push({
      method: 'post',
      path: 'admin/edit/{docid}',
      config: {
        pre: [
          { method: server.methods.cloudant.getDoc, assign: 'doc' },
          { method: newDocPost, assign: 'newDocPosted' }
        ],
        validate: { payload: docSchema },
        auth: auth
      },
      handler: adminNewDocHandler
    })

    init.options.routes.push({
      path: 'admin/new',
      config: { auth },
      handler: function (request, reply) {
        reply.redirect('/admin/new/doc')
      }
    })

    init.options.routes.push({
      path: 'admin/new/',
      config: { auth },
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
