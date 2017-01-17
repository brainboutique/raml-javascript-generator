import { Api } from 'raml-generator'
import paramCase = require('param-case')
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import { Strands } from 'strands'
var clone = require('clone');

import { hasSecurity, allResources, getSecuritySchemes } from '../support/api'
import { getUriParametersSnippet } from '../support/resource'
import { getRequestSnippet, getDisplayName } from '../support/method'
import {compile} from 'json-schema-to-typescript'

export default function (api: Api) {
  const s = new Strands()
  const projectName = paramCase(api.title)
  const className = pascalCase(api.title)
  const clientName = camelCase(api.title)

  s.multiline('// Schemas defined in '+projectName+'\n\n');

  for (const schemaWrapped of api.schemas) {

      const schemaLogicalName=Object.keys(schemaWrapped)[0];
      const schema=JSON.parse(schemaWrapped[schemaLogicalName]);
      const schemaClassName = pascalCase(schemaLogicalName);
      s.line("//========================================================================");
      s.line("// Schema '"+schemaLogicalName+"'");
      s.line("//========================================================================");
      s.line('export namespace '+schemaClassName+" {");


    // "Hack": "title" attribute is used to source the sub-type name. Make sure the root element matches the outer "module" declarationn for sake of consistency
    var sanitizedSchema=clone(schema);
    sanitizedSchema.title=undefined;

    var typeDefinition=compile(sanitizedSchema, schemaClassName, {
        declareReferenced: true,
        endPropertyWithSemicolon: true,
        endTypeWithSemicolon: true,
        useConstEnums: true,
        useFullReferencePathAsName: true
      }).replace(/^(?!$)/mg, "   ");
      s.multiline(typeDefinition);

      s.multiline("}\n\n");
  }

  return s.toString()
}
