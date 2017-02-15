'use strict'

// npm
const glob = require('glob')
const vision = require('vision')
const html = require('lodash-vision')
const _ = require('lodash')

const forTemplate = (type, x) => x.length === 2 && x[0] === type
const isPartial = forTemplate.bind(null, 'partials')
const isHelper = forTemplate.bind(null, 'helpers')

module.exports = {
  slug: (str) => _.kebabCase(_.deburr(str)),
  setupLodashVision: (server, viewsOptions) => {
    if (!viewsOptions) { viewsOptions = {} }
    if (!viewsOptions.isCached) { viewsOptions.isCached = false }
    viewsOptions.engines = { html }
    const templatesPath = viewsOptions.templatesPath || 'templates'
    const paths = glob.sync([templatesPath, '**'].join('/'), { nodir: true })
      .map((x) => x.split('/').slice(1))

    return server.register(vision)
      .then(() => {
        if (paths.length) {
          if (paths.filter((x) => x.length === 1).length) { viewsOptions.path = templatesPath }
          if (paths.filter(isPartial).length) { viewsOptions.partialsPath = [templatesPath, 'partials'].join('/') }
          if (paths.filter(isHelper).length) { viewsOptions.helpersPath = [templatesPath, 'helpers'].join('/') }
        } else {
          viewsOptions.path = [__dirname, '../templates'].join('/')
        }
        delete viewsOptions.templatesPath
        server.views(viewsOptions)
      })
  }
}
