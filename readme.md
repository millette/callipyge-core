# README

Callipyge is a simple tool to help you
build and maintain beautiful backends.

## Requirements
### Tools
This readme uses yarn (instead of npm). To install it:

```
npm install --global yarn
```

### Node 6
We use node 6.x for this project. If you don't have it installed,
I recommend https://github.com/mklement0/n-install to grab
n, the Node.js version manager.

### Services
This web engine is designed to work with two online services:

* [now.sh][] as an https web host for node (and docker)
* [Cloudant][] to host the CouchDB database

Both offer free (but limited) accounts.

#### now.sh
[now.sh][] offers the simplest node https hosting possible.
Paid accounts are about 15$/month and let you use your own domain names
and hide your source files (otherwise they are public).

Make sure you have the now-cli installed:

```
npm install --global now
```

#### Cloudant
[Cloudant][] offers a complete CouchDB service
(including geo and fulltext search). Usage is measured and
billed monthly if it's 50$ or over.

## Step by step

```
cd [somewhere]
mkdir my-project # or whatever name you choose
cd my-project # or whatever name you choose
yarn init -y
yarn add callipyge-core
node_modules/.bin/callipyge init
yarn start
```

You'll want to rerun init if you upgrade callipyge-core:

```
yarn callipyge init
```

## Customizing

## Templates
You'll find templates/ and templates/partials/ is populated with symlinks
to relevant files. Feel free to replace them as needed.

### CSS / Sass
We use [Foundation][] and Sass to style the site. You'll find symlinks
to the original files in scss/ which you can edit at will.

Use ```yarn sass``` to regenerate the css file found in the public/css/
directory.

## Security
Notice a new .env file in your project root. Make sure there's also
a .env line in your .gitignore file to prevent it from being shared.
**This .env file contains your cloudant username and password.**

[Foundation]: <http://foundation.zurb.com/sites/docs/kitchen-sink.html>
[now.sh]: <https://zeit.co/now>
[Cloudant]: <https://cloudant.com/>
