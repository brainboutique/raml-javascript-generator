import { generator, GeneratorResult } from 'raml-generator'

import gitignoreTemplate from './templates/.gitignore'
import npmignoreTemplate from './templates/.npmignore'
import installTemplate from './templates/INSTALL.md'
import packageTemplate from './templates/package.json'
import tsconfigTemplate from './templates/tsconfig.json'
import readmeTemplate from './templates/README.md'
import legacyTemplate from './templates/src/legacy.js'
import indexTemplate from './templates/src/index.ts'
import typingsTemplate from './templates/typings.json'

export const client = generator({
  templates: {
    '.gitignore': gitignoreTemplate,
    '.npmignore': npmignoreTemplate,
    'INSTALL.md': installTemplate,
    'package.json': packageTemplate,
    'tsconfig.json': tsconfigTemplate,
    'README.md': readmeTemplate,
    'src/legacy.js': legacyTemplate,
    'src/index.ts': indexTemplate,
    'typings.json': typingsTemplate
    //'types.ts': typesTemplate
  }
})
