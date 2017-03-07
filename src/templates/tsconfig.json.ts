import paramCase = require('param-case')
import { Api } from 'raml-generator'

import { hasSecurity } from '../support/api'

export default function (api: Api) {
  return JSON.stringify({
        "compilerOptions": {
          "module": "commonjs",
          "declaration": true,
          "outDir": "dist/"
        },
        "files": [
          "./src/index.ts"
        ]
      }
      , null, 2) + '\n'
}
