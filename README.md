# RAML TypeScript Generator

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]

> Generate a TypeScript (Angular2, Ionic2 or similar) JavaScript API client from RAML. Expose defined "schemas" as Typescript interfaces resp. types. 
- Allows developers to take advantage of clean API specification already at compile time.
- Reduces chance of misinterpretation of REST actions and exchanged payloads
- Eases API version updates as breaking changes should surface immediately and not only at runtime.  

Note: Generator based on library provided by MuleSoft.
## Installation

```
npm install raml-javascript-generator -g
```

## Usage

This module depends on [raml-generator](https://github.com/mulesoft-labs/raml-generator).

* Chained DSL generation with support for call signature and output document parsing
* `README.md` output
* `typed.ts` output (Note: Considering to rename to `index.ts`) 
* Legacy-style plain old Javascript `index.js` output (refer to [mulesoft/raml-javascript-generator](https://github.com/mulesoft-labs/raml-javascript-generator))

```
npm run build

#node dist\bin.js <path-to-yrml-file> -o <path-to-desired-output-directory>
#Example:
node dist\bin.js ..\..\src\api\yaas\document.raml -o ..\..\src\api\yaas\document
```

## API Usage
### Setup
Include in TypeScript project like:
```
import {SchemaService} from '../api/yaas/schema/typed';

...
export class Foo {
  schemaService: SchemaService;

  constructor() {
    this.schemaService = new SchemaService({
      getHeaders: () => {
        return (authService.getAuthHeaders())
      }
    });
  }
...
```
* Assuming API is encapsulated in single client class, no handling of setting up service as singleton yet.
* Option parameter `getHeaders` can be used to specify callback function to add custom headers to every request, for example to handle authentication.
* TODO: Injection of deviating endpoint

### API Call
Call typescript functions like:
```
        this.schemaService.tenant("foo").GET("bar", 1, 100) 
          .subscribe(s => {
            if (s._200) {
              console.log(s._200.myAttr)
            }
            else {
              console.log("Error obtaining schemas", s);
            }
          });

```
* All parameters are strongly typed based on the RAML specification.
* All mandatory parameters are moved to the front, optional ones at the end. Uses Typescript `param?:type` syntax.
* Resulting document is wrapped into typed "response" document based on the response code. The resulting object structure therefore is fully accessible to TypeScript compiler:
Example:
```
GET(  totalCount:boolean, 
      pageNumber?:number, 
      pageSize?:number)
    :Observable<{headers:any,
                responseCode:number, 
                bodyRaw:any,
                "_200"?:SchemasData.SchemasData,
                "_400"?:ErrorMessage.ErrorMessage,
                "_401"?:ErrorMessage.ErrorMessage,
                "_403"?:ErrorMessage.ErrorMessage}> 
```
* Full header, response code and raw body exposed directly.
* TODO: Currently resulting document is NOT verified against Schema specification!

## Limitations
* Used schema generator does not (yet) support $ref external references
* Only explicitly named schemas are exposed via type or interface
* No custom endpoint (yet)
* Result document not validated against schema.

## License

Apache License 2.0

[npm-image]: https://img.shields.io/npm/v/raml-typescript-generator.svg?style=flat
[npm-url]: https://npmjs.org/package/raml-typescript-generator
[downloads-image]: https://img.shields.io/npm/dm/raml-typescript-generator.svg?style=flat
[downloads-url]: https://npmjs.org/package/raml-typescript-generator
