#!/usr/bin/env node

import { bin } from 'raml-generator/bin'
import { client } from './index'

if (!process.argv || process.argv.length<3) {
  console.log("Usage: raml-typescript-generator <ramlFile.raml> -o <OutputDirectory>");
  process.exit(-1);
}
bin(client, require('../package.json'), process.argv)
console.log("Processing done. Please update package.json with custom data! At any time, run 'npm run regen' to update based on updated RAML file.");
