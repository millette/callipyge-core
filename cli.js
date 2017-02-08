#!/usr/bin/env node

'use strict'

const updateNotifier = require('update-notifier')

updateNotifier({ pkg: require('./package.json') }).notify()
