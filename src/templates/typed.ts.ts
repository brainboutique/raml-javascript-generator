import {Api} from 'raml-generator'
import paramCase = require('param-case')
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import {Strands} from 'strands'
import stringify = require('javascript-stringify')
import {getDefaultParameters} from '../support/parameters'
import {
  hasSecurity,
  getSecuritySchemes,
  allResources,
  nestedResources,
  NestedMethod,
  NestedResource
} from '../support/api'
import {isQueryMethod} from '../support/method'
import {getUriParametersSnippet} from '../support/resource'
import {getRequestSnippet, getDisplayName} from '../support/method'
import {compile, Settings} from 'json-schema-to-typescript'
import extend =require('xtend');
var clone = require('clone');

/**
 * Helper to feed out indented sections
 */
class IndentingStrands extends Strands {
  indentLevel: number = 0;
  indentPattern = "  ";

  setIndentLevel(i: number) {
    this.indentLevel = i;
  }

  setIndentPattern(s: string) {
    this.indentPattern = s;
  }

  line(...values: Object[]): this {
    return super.line(new Array(this.indentLevel + 1).join(this.indentPattern), values);
  }

}

/**
 * Default exporter
 */
export default function (api: Api) {
  const s = new IndentingStrands()
  const className = pascalCase(api.title)
  const clientName = camelCase(api.title)

  s.line("//========================================================================");
  s.line("// RAML-defined Typed REST Client for '" + api.title + "'");
  s.line("//========================================================================");
  s.multiline(`
import * as popsicle from 'popsicle';
import * as extend from 'deep-extend';
import * as setprototypeof from 'setprototypeof';
import {Observable} from 'rxjs/Observable';

`);

  for (const schemaWrapped of api.schemas) {

    const schemaLogicalName = Object.keys(schemaWrapped)[0];
    const schema = JSON.parse(schemaWrapped[schemaLogicalName]);
    const schemaClassName = pascalCase(schemaLogicalName);
    s.line("//========================================================================");
    s.line("// Schema '" + schemaLogicalName + "'");
    s.line("//========================================================================");

    const options: Settings = {
      declareReferenced: true,
      endPropertyWithSemicolon: true,
      endTypeWithSemicolon: true,
      useConstEnums: true,
      useFullReferencePathAsName: false
    }

    // "Hack": "title" attribute is used to source the sub-type name. Make sure the root element matches the outer "module" declarationn for sake of consistency
    var sanitizedSchema = clone(schema);
    sanitizedSchema.title = undefined;

    /** TRYOUT: Attempt to move "root" element out of namespace to reduce outside complexity

    // Ugly hack. Assume the fragment for root entitiy is spooled out LAST and starts with "export type|interface SchemaName " pattern...
    // Unfortunately declareReferenced does not seem to work - and no parametrization to support namespaces...
    var typeDefinitions:string = compile(sanitizedSchema, schemaClassName, options);
    var regexpMatch=(new RegExp("export (type|interface) "+schemaClassName+" ")).exec(typeDefinitions);
    var breakPoint:number=regexpMatch ? regexpMatch.index : 0;

    var typeDefinitionRoot:string=typeDefinitions.substring(breakPoint);
    var typeDefinitionReferenced:string=typeDefinitions.substring(0,breakPoint);

    s.multiline(typeDefinitionRoot);

    if (breakPoint) {
      s.line('export namespace ' + schemaClassName + " {");
      s.multiline(typeDefinitionReferenced.replace(/^(?!$)/mg, "   ")); // ...to indent all rows
      s.multiline("}\n\n");
    }

   */

    var typeDefinitions:string = compile(sanitizedSchema, schemaClassName, options);
    s.line('export namespace ' + schemaClassName + " {");
    s.multiline(typeDefinitions.replace(/^(?!$)/mg, "   ")); // ...to indent all rows
    s.multiline("}\n\n");

  }

  const flatTree = allResources(api) // For short-hand annotations.
  const nestedTree = nestedResources(api)
  const {withParams, noParams} = separateChildren(nestedTree)
  const supportedSecuritySchemes = getSecuritySchemes(api).filter(x => x.type === 'OAuth 2.0')

  if (hasSecurity(api, 'OAuth 2.0')) {
    s.line(`import * as ClientOAuth2 from 'client-oauth2'`)
  }

  s.line("//========================================================================");
  s.line("// Actions");
  s.line("//========================================================================");

  s.multiline(`

var TEMPLATE_REGEXP = /\{([^\{\}]+)\}/g

function template(string, interpolate) {
  return string.replace(TEMPLATE_REGEXP, function (match, key) {
    if (interpolate[key] != null) {
      return encodeURIComponent(interpolate[key])
    }

    return ''
  })
}  

 export class ${className} {
  _client: any;
  _path: string;
  _options: any;
  _form: any;
  _version: any;
  _Security: any;

  // RAML resources without parameters
`);

  createThisResourcesNoParams(withParams, noParams, 'this', '', 'Resources.')

  s.multiline(`
  constructor(options?:any) {
    this._path = ''
    this._options = extend({
      baseUri: ${stringify(api.baseUri)},
      baseUriParameters: ${stringify(getDefaultParameters(api.baseUriParameters)) }
    }, options)
  
    //function client (method, path, options) {
    //  return this.request(client, method, path, options)
    //}
    
    // Initialize RAML resourcs without parameters
`);

  createThisResourcesNoParamsInitialization(withParams, noParams, 'this', '', 'Resources.')
  //createThisResourcesWithParams(withParams, noParams, 'client', '', '')

  s.line(`    this._client=this;`)
  s.line(`// TODO    setprototypeof(client, this)`)
  s.line(`    this._form = popsicle.form`)
  s.line(`    this._version = ${stringify(api.version)}`)
  s.line('    this._Security = {')

  supportedSecuritySchemes.forEach((scheme: any, index: number, schemes: any[]) => {
    const name = camelCase(scheme.name)
    const trailing = index < schemes.length ? ',' : ''

    if (scheme.type === 'OAuth 2.0') {
      s.line(`  ${name}: function (options) { return new ClientOAuth2(extend(${stringify(scheme.settings)}, options)) }${trailing}`)
    }
  })

  s.multiline(`
    }
  // RAML resources with parameters
  `);
  createThisResourcesWithParams(withParams, noParams, 'this', '', 'Resources.')
  s.multiline(`
}

 request (client, method, path, opts) {
  var options = extend({}, client._options, opts)
  var baseUri = template(options.baseUri, options.baseUriParameters)

  var reqOpts = {
    url: baseUri.replace(/\\/$/, '') + template(path, options.uriParameters),
    method: method,
    headers: extend(options.headers, options.getHeaders ? options.getHeaders() : {}),
    body: options.body,
    query: options.query,
    options: options.options
  }

  if (options.user && typeof options.user.sign === 'function') {
    reqOpts = options.user.sign(reqOpts)
  }

  return popsicle.request(reqOpts)
}

`)


  for (const resource of flatTree) {
    const {relativeUri, uriParameters} = resource

    for (const method of resource.methods) {
      if (method.annotations && method.annotations['client.methodName']) {
        const methodName = method.annotations['client.methodName'].structuredValue
        const type = isQueryMethod(method) ? 'query' : 'body'
        const headers = getDefaultParameters(method.headers)

        if (Object.keys(uriParameters).length) {
          s.line(`export ${methodName}(uriParams, ${type}, opts) {`)
          s.line(`  var uriParameters = extend(${stringify(getDefaultParameters(uriParameters))}, uriParams)`)
          s.line(`  var options = extend({ ${type}: ${type}, uriParameters: uriParameters, headers: ${stringify(headers)} }, opts)`)
          s.line(`  return this.request(this, ${stringify(method.method)}, ${stringify(relativeUri)}, options)`)
          s.line(`}`)
        } else {
          s.line(`export ${methodName}(${type}, opts) {`)
          s.line(`  var options = extend({ ${type}: ${type}, headers: ${stringify(headers)} }, opts)`)
          s.line(`  return this.request(this, ${stringify(method.method)}, ${stringify(relativeUri)}, options)`)
          s.line(`}`)
        }
      }
    }
  }

  createProtoResources(withParams, noParams, 'Client', 'Resources.')


  createProtoMethods(nestedTree.methods, 'Client', 'this', `''`, 'Resources.')
  s.line("}");

  s.line("export module Resources {");
  createChildren(nestedTree.children, '')

  s.line("}");


  // Interface for mapped nested resources.
  interface KeyedNestedResources {
    [key: string]: NestedResource
  }

  // Create prototype methods.
  function createProtoMethods(methods: NestedMethod[], id: string, _client: string, _path: string, idPrefix: string) {
    for (const method of methods) {
      const headers = getDefaultParameters(method.headers)
      //const type = isQueryMethod(method) ? 'query' : 'body'

      var schemasData:string="{headers:any,responseCode:number, bodyRaw:any";
      Object.keys(method.responseSchemas).forEach(responseCode => {
        var schema: string = method.responseSchemas[responseCode];
        if (schema && !schema.startsWith("{")) {
          var schemaType = pascalCase(schema);
          schemasData+=',"_'+responseCode+'"?:'+schemaType+"."+schemaType; // FIXME: Update once namespace improvement in place, see above
        }
        else
          schemasData+=',"'+responseCode+'":any';
      })
      schemasData+="}";


      // Assemble query parameters
      var queryParamsSignatureMandatory:string="";
      var queryParamsSignatureOptional:string="";
      var paramsInjection:string[]=[];
      if (method.queryParameters) Object.keys(method.queryParameters).forEach((parameterName:string) => {
        var param=method.queryParameters[parameterName];
        var tmp=parameterName
        if (!param.required)
           tmp+="?";
        switch (param.type) {
          case "integer":
            tmp += ":number";
            break;
          case "boolean":
            tmp += ":" + param.type;
            break;
          default:
            tmp += ":string";
        }
        if (!param.required)
          queryParamsSignatureOptional+=tmp+", "
        else
          queryParamsSignatureMandatory+=tmp+", "

        if (param.minimum)
          paramsInjection.push("if ("+parameterName+" !== undefined && "+parameterName+" < "+param.minimum+") { observer.error('Parameter \\'"+parameterName+"\\' outside specified range!'); return;}");
        if (param.maximum)
          paramsInjection.push("if ("+parameterName+" !== undefined && "+parameterName+" > "+param.maximum+") { observer.error('Parameter \\'"+parameterName+"\\' outside specified range!'); return;}");

        paramsInjection.push("if ("+parameterName+" !== undefined && "+parameterName+" !== null) options.query."+parameterName+"="+parameterName+";");
      });

      // Assemble body parameter
      var bodyParam:string="";
      var bodyParamInjection:string[]=[];
      if (!isQueryMethod(method) && method.body) {
        bodyParam+="body"; // TODO Check: Optional body parameter?  + (!method.body.required ? "?" : "")
        if (method.body['application/json'] && method.body['application/json'].schema) {
          var schemaName:string=pascalCase(method.body['application/json'].schema);
          bodyParam += ":"+schemaName+"."+schemaName+", "; // FIXME once name hierarchy improved
        }
        else
          bodyParam+=":any, "
        paramsInjection.push("options.body=body;");
      }


      s.line(`  /**`);
      s.line(`   * ${method.method.toUpperCase()} on ${id} - ` + JSON.stringify(method.responseSchemas));
      s.line(`   */`);
      s.line(`  ${method.method.toUpperCase()}(${queryParamsSignatureMandatory}${bodyParam}${queryParamsSignatureOptional}opts?:any):Observable<` + schemasData + `> {`)
      s.line(`    return Observable.create((observer) => {`);
      s.line(`       var options = extend({query:{}, headers: ${stringify(headers)} }, opts)`)
      paramsInjection.forEach((l)=>{
        s.line(`       `+l);
      });
      s.line(`       this._client.request(${_client}, ${stringify(method.method)}, ${_path}, options)`)
      s.line(`         .use(popsicle.plugins.parse('json'))`)
      s.line(`         .then(response => {`)
      s.line(`             var r={headers:response.headers,responseCode:response.status,bodyRaw:response.body};`);
      s.line(`             r["_"+response.status]=response.body; `);
      s.line(`             observer.next(r);observer.complete()`);
      s.line(`      })`)
      s.line(`    })`)
      s.line(`  }`)
    }
  }

  // Split children by "type" of method that needs to be created.
  function separateChildren(resource: NestedResource) {
    const withParams: KeyedNestedResources = {}
    const noParams: KeyedNestedResources = {}

    // Split apart children types.
    for (const key of Object.keys(resource.children)) {
      const child = resource.children[key]

      if (Object.keys(child.uriParameters).length) {
        withParams[child.methodName] = child
      } else {
        noParams[child.methodName] = child
      }
    }

    return {withParams, noParams}
  }

  function toParamsFunction(child: NestedResource, _client: string, _prefix: string, idPrefix: string) {
    return `(uriParams:any) { return new ${idPrefix}${child.id}(${_client}, ${_prefix}template(${stringify(child.relativeUri)}, extend(${stringify(getDefaultParameters(child.uriParameters))}, uriParams))) }`
  }

  function toParamsFunctionSingle(parameterName:string, child: NestedResource, _client: string, _prefix: string, idPrefix: string) {
    return `(${parameterName}:string) { return new ${idPrefix}${child.id}(${_client}, ${_prefix}template(${stringify(child.relativeUri)}, extend(${stringify(getDefaultParameters(child.uriParameters))}, {${parameterName}:${parameterName}}))) }`
  }


  // Create prototype resources.
  function createProtoResources(withParams: KeyedNestedResources, noParams: KeyedNestedResources, id: string, idPrefix: string) {
    //console.log("###No params skip: "+Object.keys(withParams), "### Without: ",noParams);
    for (const key of Object.keys(withParams)) {
      const child = withParams[key]
      //console.log("###",key);

      // Skip inlined entries.
      if (noParams[key] != null) {
        console.log("No params skip: "+key)
        continue
      }

      s.line(`// createProtoResources - Resource: ${id}`);
      s.line(`${child.methodName}${toParamsFunctionSingle(key,child, 'this._client', 'this._path + ', idPrefix)}`)
      // LEGACY STYLE: s.line(`${child.methodName}${toParamsFunction(child, 'this._client', 'this._path + ', idPrefix)}`)
    }
  }

  // Create nested resource instances.
  function createResource(resource: NestedResource, idPrefix: string) {
    const {withParams, noParams} = separateChildren(resource)

    s.line(`// createResource - ${resource.id}`);
    s.line(`export class ${resource.id} { `);
    s.line(`  _client: any; _path: string;`);
    createThisResourcesNoParams(withParams, noParams, 'this._client', 'this._path + ', idPrefix)
    s.line(`  constructor(client, path) {`)
    s.line(`    this._client = client`)
    s.line(`    this._path = path`)
    createThisResourcesNoParamsInitialization(withParams, noParams, 'this._client', 'this._path + ', idPrefix)
    s.line(`  }`)

    createThisResourcesWithParams(withParams, noParams, 'this._client', 'this._path + ', idPrefix)

    createProtoResources(withParams, noParams, resource.id, idPrefix)

    createProtoMethods(resource.methods, resource.id, 'this._client', 'this._path', idPrefix)

    s.line(`}`)

    s.line(`export module ${resource.id} { `);

    createChildren(resource.children, idPrefix)

    s.line(`}`)

  }

  // Generate all children.
  function createChildren(children: KeyedNestedResources, idPrefix: string) {
    const indentLevel = (idPrefix.match(/\./g) || []).length;
    ;
    s.setIndentLevel(indentLevel + 1);
    for (const key of Object.keys(children)) {
      createResource(children[key], idPrefix + children[key].id + ".")
    }
    s.setIndentLevel(indentLevel);
  }

  function createThisResourcesWithParams(withParams: KeyedNestedResources, noParams: KeyedNestedResources, _client: string, _prefix: string, idPrefix: string) {
    for (const key of Object.keys(noParams)) {
      const child = noParams[key]
      const constructor = `new ${idPrefix}${child.id}(${_client}, ${_prefix}${stringify(child.relativeUri)})`

      if (withParams[key] == null) {
        //s.line(`  ${child.methodName} = ${constructor}`)
      } else {
        s.line(`  // createThisResourcesWithParams - ` + key);
        s.line(`  ${child.methodName}(${toParamsFunction(withParams[key], _client, _prefix, idPrefix)}, ${constructor})`)
      }
    }
  }

  function createThisResourcesNoParams(withParams: KeyedNestedResources, noParams: KeyedNestedResources, _client: string, _prefix: string, idPrefix: string) {
    for (const key of Object.keys(noParams)) {
      const child = noParams[key]
      if (withParams[key] == null) {
        s.line(`  ${child.methodName}:${idPrefix}${child.id};`)
      }
    }
  }

  function createThisResourcesNoParamsInitialization(withParams: KeyedNestedResources, noParams: KeyedNestedResources, _client: string, _prefix: string, idPrefix: string) {
    for (const key of Object.keys(noParams)) {
      const child = noParams[key]
      const constructor = `new ${idPrefix}${child.id}(${_client}, ${_prefix}${stringify(child.relativeUri)})`

      if (withParams[key] == null) {
        s.line(`  // TODO createThisResourcesNoParams - ` + key);
        s.line(`  /* ` + JSON.stringify(child) + "*/");
        s.line(`  this.${child.methodName} = ${constructor}`)
      }
    }
  }


  return s.toString()
}
