import recast from 'recast'
import recastTS from './recast-ts.shim.cjs'

import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

export class File {
  constructor (path) {
    if (!statSync(path).isFile()) {
      throw new Error(`${path} must be a file`)
    }
    this.path = path
  }
  load () {
    return this
  }
  patch () {
    return this
  }
  save () {
    return this
  }
}

/** Represents a JSON module. */
export class JSONFile extends File {}

/** Represents a TypeScript module.
  * Contains its imports and exports. */
export class TSFile extends File {

  constructor (path) {
    super(path)
    this.imports = new Map()
    this.importTypes = new Map()
    this.exports = new Set()
    this.exportTypes = new Set()
    this.modified = false
    this.parsed = recast.parse(readFileSync(this.path), { parser: recastTS })
  }

  /** Populate the import and export collections. */
  load () {
    for (const declaration of this.parsed.program.body) {
      //console.log(declaration)
      if (declaration.type === 'ImportDeclaration') {
        //console.log(`  imported (${declaration.importKind}) from ${declaration.source.extra.raw}:`)
        if (declaration.importKind === 'type') {
          addImport(this.importTypes, declaration)
        } else {
          addImport(this.imports, declaration)
        }
      }
      if (declaration.type === 'ExportNamedDeclaration') {
        //console.log(`  exported (${declaration.exportKind}) from ${declaration.source.extra.raw}:`)
        if (declaration.exportKind === 'type') {
          addExport(this.exportTypes, declaration)
        } else {
          addExport(this.exports, declaration)
        }
      }
    }
    return this
  }

  /** Replace `import` with `import type` where appropriate. */
  patch (root) {
    console.log(`\n~ resolving from: ${this.path}`)
    // Copy the collections that we will be modifying
    const newImports = cloneMap(this.imports)
    const newImportTypes = cloneMap(this.importTypes)
    // For every import declaration in current module:
    for (const [target, specifiers] of this.imports.entries()) {
      console.log(`  ${target}`)
      // Find the referenced module
      const resolved = root.resolve(this, target)
      if (!resolved) {
        // Ignore imports from outside packages
        if (!target.startsWith('.')) continue
        throw new Error(`failed resolving ${target} from ${this.path}`)
      }
      if (resolved.path.endsWith('.json')) continue
      // For every identifier imported from that module:
      for (const [importedAs, imported] of specifiers) {
        if (imported !== importedAs) {
          console.log(`    ${imported} (as ${importedAs})`)
        } else {
          console.log(`    ${imported}`)
        }
        // If it's missing in the referenced module's
        // exported values, but exists in its exported *types*,
        // change the import statement to import type:
        if (!resolved.exports.has(imported)) {
          if (resolved.exportTypes.has(imported)) {
            console.log(`      changing to type import: ${imported}`)
            TSFile.patchedTypeImports++
            newImports.get(target).delete(importedAs)
            getDefault(newImportTypes, target, new Map()).set(importedAs, imported)
          } else {
            throw new Error(`${resolved.path}: ${imported} not found (from ${this.path})`)
          }
        }
      }
    }
    // Replace collections with the modified ones
    this.imports = newImports
    this.importTypes = newImportTypes
    return this
  }
  /** Update AST with patched imports */
  save (dry = false) {
    const { imports, importTypes } = this
    // Visit each import declaration and optionally
    // separate it into `import` and `import type`:
    recast.visit(this.parsed, {
      visitImportDeclaration (declaration) {
        // Split the declaration's specifiers into value and type imports
        // according to the result of the preceding call to `resolve`.
        const newValues = imports.get(declaration.value.source.value)
        const newTypes  = importTypes.get(declaration.value.source.value)
        const valueSpecifiers = []
        let nsSpecifier = null
        // Leave only the value specifiers, separating the type specifiers.
        const typeSpecifiers = []
        declaration.value.specifiers = declaration.value.specifiers.filter(specifier=>{
          if (specifier.type === 'ImportNamespaceSpecifier') {
            console.log('preserving namespace specifier')
            // Preserve `import *`
            return true
          }
          if (newTypes && newTypes.has(specifier.local.name)) {
            // Extract imports that resolve to types
            typeSpecifiers.push(specifier)
            return false
          }
          // Pass through the rest as is
          return true
        })
        // If there were any type specifiers extracted,
        // we need to contain them in an `import type` declaration
        // so that they don't get compiled to missing `import`s.
        if (typeSpecifiers.length > 0) {
          if (declaration.value.specifiers.length < 1) {
            // If all specifiers turned out to be type specifiers,
            // and there are no remaining value specifiers, change
            // the existing import declaration to `import type`
            // so as not to lose the attached comment nodes.
            declaration.value.specifiers = typeSpecifiers
            declaration.value.importKind = 'type'
          } else {
            // If the declaration turned out to contain some
            // type specifiers and also some value specifiers,
            // append a separate `import type`  after the `import`.
            declaration.insertAfter(Object.assign(recast.types.builders.importDeclaration(
              typeSpecifiers, declaration.value.source
            ), {
              importKind: 'type'
            }))
          }
        }
        // Either way, there's no need to traverse inwards:
        return false
      }
    })
    // If this is not a dry run, save the modified file now.
    if (!dry) {
      writeFileSync(this.path, recast.print(this.parsed).code)
    }
  }

  static patchedTypeImports = 0

}

function addImport (imports, declaration) {
  imports = getDefault(imports, declaration.source.value, new Map())
  for (const specifier of declaration.specifiers) {
    if (specifier.type === 'ImportSpecifier') {
      imports.set(specifier.local.name, specifier.imported.name)
    } else if (specifier.type === 'ImportDefaultSpecifier') {
      imports.set(specifier.local.name, 'default')
    }
  }
}

function addExport (exports, declaration) {
  if (declaration.declaration) {
    if (declaration.declaration.id) {
      exports.add(declaration.declaration.id.name)
    }
    if (declaration.declaration.declarations) {
      for (const { id: { name } } of declaration.declaration.declarations) {
        exports.add(name)
      }
    }
  }
  for (const specifier of declaration.specifiers) {
    exports.add(specifier.exported.name)
  }
}

/** Get a key in a map, setting it to provided default if missing. */
function getDefault (map, key, def) {
  if (map.has(key)) {
    return map.get(key)
  } else {
    map.set(key, def)
    return def
  }
}

/** Clone a map of maps */
function cloneMap (oldMap) {
  const newMap = new Map()
  for (const [key, submap] of oldMap) {
    newMap.set(key, new Map(submap))
  }
  return newMap
}
