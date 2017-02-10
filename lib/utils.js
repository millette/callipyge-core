'use strict'

// npm
const glob = require('glob')
const vision = require('vision')
const html = require('lodash-vision')

const forTemplate = (type, x) => x.length === 2 && x[0] === type
const isPartial = forTemplate.bind(null, 'partials')
const isHelper = forTemplate.bind(null, 'helpers')

module.exports = {
  setupLodashVision: (server, viewsOptions) => {
    if (!viewsOptions) { viewsOptions = {} }
    if (!viewsOptions.isCached) { viewsOptions.isCached = false }
    const templatesPath = viewsOptions.templatesPath || 'templates'
    const paths = glob.sync([templatesPath, '**'].join('/'), { nodir: true })
      .map((x) => x.split('/').slice(1))

    return server.register(vision)
      .then(() => {
        if (!paths.length) { return }
        viewsOptions.engines = { html }
        if (paths.filter((x) => x.length === 1).length) { viewsOptions.path = templatesPath }
        if (paths.filter(isPartial).length) { viewsOptions.partialsPath = [templatesPath, 'partials'].join('/') }
        if (paths.filter(isHelper).length) { viewsOptions.helpersPath = [templatesPath, 'helpers'].join('/') }
        delete viewsOptions.templatesPath
        server.views(viewsOptions)
      })
  }
}
