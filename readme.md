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

## Security
Notice a new .env file in your project root. Make sure there's also
a .env line in your .gitignore file to prevent it from being shared.
**This .env file contains your cloudant username and password.**
