import { Api } from 'raml-generator'
import paramCase = require('param-case')
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import { Strands } from 'strands'

import { hasSecurity, allResources, getSecuritySchemes } from '../support/api'
import { getUriParametersSnippet } from '../support/resource'
import { getRequestSnippet, getDisplayName } from '../support/method'

export default function (api: Api) {
  const s = new Strands()
  const projectName = paramCase(api.title)
  const className = pascalCase(api.title)
  const clientName = camelCase(api.title)

  s.multiline(`# ${api.title}

> TypeScript abstraction library for RAML-based REST API [${api.title}](${api.baseUri}).

Auto-generated using [raml-typescript-generator](https://github.com/brainboutique/raml-typescript-generator). 

## Installation

\`\`\`sh
npm install ${projectName} --save
\`\`\`

## Usage

### TypeScript
\`\`\`ts
import \{${className}\} from '${projectName}';
...
constructor(..) {
  this.${clientName} = new ${className}({});
}
\`\`\`

To support multiple versions of the API, it is recommended to alias the import so it can easily be mapped to a later API version - and, due to the nature of Typescript, 
you should be alerted on API signature changes already at compile time:

 \`\`\`ts
import \{${className} as ${className.replace(/V[0-9]*$/,"")}\} from '${projectName}';
 \`\`\`


### JS (Legacy)
API skeleton as it would be produced by MuleSoft's [raml-javascript-generator](https://github.com/mulesoft-labs/raml-javascript-generator) JS generator is shipped for reference and to ease migrations:
\`\`\`js
var ${className} = require('${projectName}/leagcy.js')

var client = new ${className}()
\`\`\`
`)

  if (hasSecurity(api, 'OAuth 2.0')) {
    s.multiline(`### Authentication

#### OAuth 2.0
(!) Feature ported from legacy raml-javascript-generator but not yet finalized! You are on your own here...

This API supports authentication with [OAuth 2.0](https://github.com/mulesoft/js-client-oauth2). Initialize the \`OAuth2\` instance with the application client id, client secret and a redirect uri to authenticate with users.

\`\`\`js
var auth = new ${className}.security.<method>({
  clientId:     '123',
  clientSecret: 'abc',
  redirectUri:  'http://example.com/auth/callback'
});

// Available methods for OAuth 2.0:`)

    for (const scheme of getSecuritySchemes(api)) {
      if (scheme.type === 'OAuth 2.0') {
        s.line(` - ${camelCase(scheme.name)}`)
      }
    }

    s.line('```')
  }

  s.multiline(`### Options

You can set options when you initialize a client or at any time with the \`options\` property. You may also override options per request by passing an object as the last argument of request methods. For example:

\`\`\`javascript
client = new ${className}({ ... })

client('GET', '/', {
  baseUri: '${api.baseUri ? api.baseUri.replace(/\/[^/]*$/,"/anotherVersion") : "https://example.com"}',
  headers: {
    'Content-Type': 'application/json'
  }
})
\`\`\`

For dynamic header injection - for example required for non-standard REST services asking for custom authentication token - a provider may be defined:

\`\`\`javascript
client = new ${className}({
  getHeaders: ()=>{ return(this.myToken ? {Authorization: "Bearer " + this.myToken} : {}) }
});
\`\`\`

#### Base URI
By default, endpoint as defined in RAML file \`${api.baseUri}\` is used.

**Note** If supported by API provider, it is recommended to use one API version definition (i.e. RAML file and corresponding API TypeScript library) and switch endpoint based on the desired environment, for example \`test\`, \`qa\` or \`prod\`

You can override the base URI by setting the \`baseUri\` property, or initializing a client with a base URI. For example:

\`\`\`javascript
new ${className}({
  baseUri: '${api.baseUri ? api.baseUri.replace(/\/[^/]*$/,"/anotherVersion") : "https://example.com"}',
});
\`\`\`


### Methods

All methods return an Observable wrapping a [Popsicle](https://github.com/blakeembrey/popsicle) obtained response:
`)

  for (const resource of allResources(api)) {
    for (const method of resource.methods) {
      s.line(`#### ${getDisplayName(method, resource)}`)
      s.line()

      if (Object.keys(resource.uriParameters).length) {
        s.line(getUriParametersSnippet(resource))
        s.line()
      }

      if (method.description) {
        s.multiline(method.description.trim())
        s.line()
      }

      s.multiline(`\`\`\`js
client.${getRequestSnippet(method, resource)}.then(...)
\`\`\`
  `)
    }
  }

  s.line('## License')
  s.line()
  s.line('Apache 2.0')

  return s.toString()
}
