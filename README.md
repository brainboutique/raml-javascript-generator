# RAML TypeScript Generator

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]

> Generate a TypeScript (Angular2, Ionic2 or similar) JavaScript API client from RAML. Expose defined "schemas" as Typescript interfaces resp. types. 
- Allows developers to take advantage of clean API specification already at compile time.
- Reduces chance of misinterpretation of REST actions and exchanged payloads
- Eases API version updates as breaking changes should surface immediately and not only at runtime.  

Based on provided RAML file, a self-contained Node module is produced, including following assets:
- Chained DSL with support for call signature and output document parsing
- `README.md` output
- `index.ts` output
- All required scaffolding to allow easy use of generated module in own projects or publish to npmjs
- Legacy-style plain old Javascript `legacy.js` output (refer to [mulesoft/raml-javascript-generator](https://github.com/mulesoft-labs/raml-javascript-generator))

Generator based on [raml-generator](https://github.com/mulesoft-labs/raml-generator) provided by MuleSoft.

## Installation

```
npm install raml-typescript-generator -g
```

## Usage
Sets up node API module based on RAML file.

Example use:
1) Create new module (Hint:Create directory outside your GIT-managed project file structure if you want to check the module in to separate repository.):
 ```
  mkdir myApiModule
  cd myApiModule
  
  cp ../wherever/from/myApi.raml .
  raml-typescript-generator myApi.raml -o .
  npm i
  npm run build
 ```
2) Update `package.json` to, for example, reflect author, URL locations, versions etc.
3) Use module in own application w/out distributing to npmjs yet.
```
cd ../myProject
npm i ../myApiModule
```
At this point, you should be able to use your custom API library as standard Node module within your application - refer to `README.MD` in produced module for usage instructions.

4) Check in to version control (git)
```
cd ../myApiModule
git add .
git commit -a

# Create repo on github or similar, do not initialize with readme or similar...
# -> https://github.com/new
git remote add origin https://github.com/yourName/myApiModule.git
git push --set-upstream origin master
```

5) Publish to npmjs

**Attention!** This cannot be undone! Ensure you do not push private code or data or any credentials!
Ensure to update package version number using SemVer

```
npm publish
```


**Hint:** After updates in RAML file, API code can be re-generated using ``npm run regen``. Note that only essential attributes of `package.json` are updated! **Warning!** If you perform a breaking change on the API, it is recommended to bump the version number and produce a new API module instead!  
### Contributing
- Clone [raml-typescript-generator](https://github.com/brainboutique/raml-typescript-generator.git) from github.
- Update and build, run on your custom RAML file to verify results
```
npm run build

#node dist\bin.js <path-to-yrml-file> -o <path-to-desired-output-directory>
#Example:
node dist\bin.js ..\..\src\api\yaas\document.raml -o ..\..\src\api\yaas\document
```
- Package up and install as global library. 
```
npm install -g
```
Now you should be able to run `raml-typescript-generator` as described below in any custom module location.


## API Usage
Please refer to `README.MD` generated in your new API module for details!
### Setup
Include in TypeScript project like:
```
import {SchemaApi} from 'schema-api';

...
export class Foo {
  schemaApi: SchemaApi;

  constructor() {
    this.schemaApi = new SchemaApi({
      getHeaders: () => {
        return (authService.getAuthHeaders())
      }
    });
  }
...
```
* Assuming API is encapsulated in single client class, no handling of setting up service as singleton (yet).
* Option parameter `getHeaders` can be used to specify callback function to add custom headers to every request, for example to handle authentication.
* Use option `baseUri` to switch endpoints.

### API Call
Call typescript functions like:
```
        this.schemaApi.tenant("foo").GET("bar", 1, 100) 
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
* Used schema generator does not (yet) support `$ref` external references
* Only explicitly named schemas are exposed via type or interface
* Result document not validated against schema.

## License

Apache License 2.0

[npm-image]: https://img.shields.io/npm/v/raml-typescript-generator.svg?style=flat
[npm-url]: https://npmjs.org/package/raml-typescript-generator
[downloads-image]: https://img.shields.io/npm/dm/raml-typescript-generator.svg?style=flat
[downloads-url]: https://npmjs.org/package/raml-typescript-generator
