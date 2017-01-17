import { generator, GeneratorResult } from 'raml-generator'

import gitignoreTemplate from './templates/.gitignore'
import installTemplate from './templates/INSTALL.md'
import packageTemplate from './templates/package.json'
import readmeTemplate from './templates/README.md'
import indexTemplate from './templates/index.js'
//import typesTemplate from './templates/types'
import typedTemplate from './templates/typed.ts'

export const client = generator({
  templates: {
    '.gitignore': gitignoreTemplate,
    'INSTALL.md': installTemplate,
    'package.json': packageTemplate,
    'README.md': readmeTemplate,
    'index.js': indexTemplate,
    'typed.ts': typedTemplate,
    //'types.ts': typesTemplate
  }
})
