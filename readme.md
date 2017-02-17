# README

Callipyge is a simple tool to help you
build and maintain beautiful backends.

## Step by step

```
cd [somewhere]
mkdir my-project
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
