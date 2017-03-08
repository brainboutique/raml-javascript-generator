import paramCase = require('param-case')
import { Api } from 'raml-generator'

import { hasSecurity } from '../support/api'

var fs = require('fs');


export default function (api: Api) {

  var defaults:any={
    name: paramCase(api.title),
    version: '0.0.1',
    description: "[Auto-generated using raml-typescript-generator] "+api.description,
    main: './dist/index.js',
    types: './dist/index',
    files: [
      'dist/*',
      'typings/**'
    ],
    repository: {
      type: 'git',
      url: '@FIXME'
    },
    keywords: [
      'raml-api',
      '@FIXME'
    ],
    "scripts": {
      "regen": "raml-typescript-generator "+process.argv[2]+ " -o . && npm run build",
      "prepare": "typings install",
      "compile": "tsc",
      "copyLegacy": "copyfiles -f src/*.js dist",
      "build": "npm run prepare && npm run compile && npm run copyLegacy",
      "prepublish": "npm run build"
    },
    author: '@FIXME',
    license: 'Apache-2.0',
    bugs: {
      url: '@FIXME'
    },
    homepage: '@FIXME',
    dependencies: {
      'client-oauth2': hasSecurity(api, 'OAuth 2.0') ? '^3.4.0' : undefined,
      "@reactivex/rxjs": "^5.2.0",
      'deep-extend': '^0.4.1',
      'popsicle': '^5.0.0',
      'setprototypeof': '^1.0.1',
      "@types/es6-shim": "^0.31.32",
    },
    devDependencies: {
      "copyfiles": "^1.2.0"
    }

    };

  var packageInfo:any={};
  try {
    packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  }
  catch(e) {
    console.log("Creating new package.json file as not readable. Hint: You may update most properties in package.json! "+e);
  }

  // Force defaults for specific keys
  let forced:any={'main':true,'types':true,'files':true,'scripts':true,'dependencies':true, 'devDependencies':true};

  Object.keys(defaults).forEach(key => {
    if (!packageInfo[key] || forced[key])
      packageInfo[key]=defaults[key]
  });

  return JSON.stringify(packageInfo, null, 2) + '\n'
}
