'use strict'

// const npm
const glob = require('glob')

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

    if (!paths.length) { return }
    server.register(require('vision'), (err) => {
      if (err) { throw err }
      viewsOptions.engines = { html: require('lodash-vision') }
      if (paths.filter((x) => x.length === 1).length) { viewsOptions.path = templatesPath }
      if (paths.filter(isPartial).length) { viewsOptions.partialsPath = [templatesPath, 'partials'].join('/') }
      if (paths.filter(isHelper).length) { viewsOptions.helpersPath = [templatesPath, 'helpers'].join('/') }
      delete viewsOptions.templatesPath
      server.views(viewsOptions)
    })
  }
}
