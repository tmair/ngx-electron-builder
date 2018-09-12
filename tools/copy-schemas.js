#!/usr/bin/env node

const fs = require('fs');
const path = require('path')

const builders = require(path.resolve(__dirname, '..', 'builders.json'));

Object.keys(builders.builders)
.map(builder => builders.builders[builder])
.map(builder => {
  return [path.resolve(__dirname, '..', 'src', builder.schema), path.resolve(__dirname, '..', 'dist', builder.schema)];
}).forEach(([source, dest]) => fs.copyFileSync(source, dest));
