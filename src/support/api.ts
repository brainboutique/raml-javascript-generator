import extend = require('xtend')
import uniqueId = require('uniqueid')
import pascalCase = require('pascal-case')

import { getUsedUriParameters, toMethodName } from './resource'

/**
 * Check for existence of a security scheme type.
 */
export function hasSecurity (api: any, type: string) {
  if (!api.securitySchemes)
     return false;
  return api.securitySchemes.some((schemes: any) => {
    for (const key of Object.keys(schemes)) {
      if (schemes[key].type === type) {
        return true
      }
    }

    return false
  })
}

/**
 * Flatten the broken nested security scheme array.
 */
export function getSecuritySchemes (api: any): any[] {
  const schemes: any[] = []

  if (api.securitySchemes) {
    for (const nested of api.securitySchemes) {
      for (const key of Object.keys(nested)) {
        schemes.push(nested[key])
      }
    }
  }

  return schemes
}

export interface AllResource {
  methods: any[]
  relativeUri: string
  uriParameters: any
  description: string
}

/**
 * Retrieve all resources as an array.
 */
export function allResources (api: any): AllResource[] {
  const array: AllResource[] = []

  // Recursively push all resources into a single flattened array.
  function recurse (resources: any[], prevUri: string, prevUriParams: any) {
    for (const resource of resources) {
      const relativeUri = prevUri + resource.relativeUri
      const uriParameters = getUsedUriParameters(relativeUri, extend(resource.uriParameters, prevUriParams))
      const methods = resource.methods ? resource.methods : []
      const { description } = resource

      array.push({ methods, relativeUri, uriParameters, description })

      if (resource.resources) {
        recurse(resource.resources, relativeUri, uriParameters)
      }
    }
  }

  recurse(api.resources, '', {})

  return array
}

export interface NestedResource {
  id: string
  methodName: string
  methods: NestedMethod[]
  relativeUri: string
  uriParameters: any
  children: {
    [path: string]: NestedResource
  }
}

export interface NestedMethod {
  id: string
  method: string
  headers: any
  queryParameters: {[name:string]:any};
  responseSchemas: {[responseCode: string]: string}
  body: any
}

/**
 * Generate a normalized and nested tree of resources.
 */
export function nestedResources (api: any): NestedResource {
  const methodId = uniqueId('Method')
  const resourceId = uniqueId('Resource')
  var keyUniqueness:{[id:string]:(()=>string)}={};

  const resource: NestedResource = {
    id: resourceId(),
    methodName: undefined,
    methods: [],
    relativeUri: '/',
    uriParameters: {},
    children: {}
  }

  function makeResource (node: NestedResource, child: any, segments: string[]): NestedResource {
    if (segments.length === 0) {
      if (child.methods) {
        // Push existing methods onto the active segment.
        for (const method of child.methods) {
          var m:NestedMethod={
            id: methodId(),
            method: method.method,
            queryParameters: method.queryParameters,
            body: method.body,
            headers: method.headers,
            responseSchemas:{}
          };

          Object.keys(method.responses||{}).forEach((responseCode:any)=>{
             var responseInfo=method.responses[responseCode].body||{};
             m.responseSchemas[responseCode]=(responseInfo['application/json']||{}).schema
          })
          node.methods.push(m);
        }
      }

      return node
    }

    // Use segments as the key.
    const key = segments[0]
    let childResource = key === '/' ? node : node.children[key]

    if (childResource == null) {
      var id:string=(node.id == "Resource0" ? "" : node.id) +pascalCase(key.replace(/^[a-zA-Z]/g,""));
      if (keyUniqueness[id]!=undefined)
      {
        id=keyUniqueness[id](); // In case this ID was already used, replace with unique'd version.
      }
      else {
        keyUniqueness[id] = uniqueId(id);
      }
      childResource = node.children[key] = {
        id: id, //resourceId(),
        methodName: toMethodName(key),
        children: {},
        methods: [],
        uriParameters: getUsedUriParameters(key, child.uriParameters),
        relativeUri: key
      }
    }

    return makeResource(childResource, child, segments.slice(1))
  }

  function handle (resource: NestedResource, children: any[]) {
    for (const child of children) {
      const segments = child.relativeUri.split(/(?=[\/\.])/g)
      const childResource = makeResource(resource, child, segments)

      if (child.resources) {
        handle(childResource, child.resources)
      }
    }
  }

  handle(resource, api.resources)

  return resource
}
