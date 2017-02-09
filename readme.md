# README

## Step by step

```
cd [somewhere]
mkdir my-project
yarn init -y
yarn add callipyge-core
git init
```

.gitignore:
```
node_modules
.env
```

Insert into package.json:
```
"script": {
  "callipyge": "callipyge"
},
```

Next, you can run:
```
yarn callipyge
```

You will be prompted for cloudant username and password to store
in ```.env```.

To get help:
```
yarn callipyge help
yarn callipyge help --all
```

Create database:
```
yarn callipyge create-db
```

You will be asked to confirm username, password and database name.
The database name will default to your project's name.
