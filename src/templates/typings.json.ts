import paramCase = require('param-case')
import {Api} from 'raml-generator'

import {hasSecurity} from '../support/api'

export default function (api: Api) {
  return JSON.stringify({
    "name": paramCase(api.title),
    "dependencies": {},
    "globalDependencies": {
      "es6-shim": "registry:dt/es6-shim#0.31.2+20160726072212"
    }
  }, null, 2);
}
