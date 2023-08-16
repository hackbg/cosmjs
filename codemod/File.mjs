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
  save () {
    //console.log()
    //console.log('~', this.path)
    // Clone things that we will be modifying while iterating
    const processedImports = cloneMap(this.imports)
    const processedImportTypes = cloneMap(this.importTypes)
    // Iterate over the top-level declarations of the module
    // to find the imports that we will be modifying
    const declarations = []
    for (const declaration of this.parsed.program.body) {
      const { type, importKind, specifiers, source, assertions } = declaration
      if (type === 'ImportDeclaration' && importKind === 'value') {
        // If this is an import declaration, check if we need to
        // split it into value and type sections.
        const newValues = this.imports.get(declaration.source.value)
        const newTypes  = this.importTypes.get(declaration.source.value)
        const valueSpecifiers = []
        const typeSpecifiers = []
        let nsSpecifier = null
        for (const specifier of declaration.specifiers) {
          if (specifier.type === 'ImportNamespaceSpecifier') {
            nsSpecifier = specifier
          }
          if (newValues.has(specifier.local.name)) {
            valueSpecifiers.push(specifier)
          }
          if (newTypes && newTypes.has(specifier.local.name)) {
            typeSpecifiers.push(specifier)
          }
        }
        //console.log('source=', declaration.source)
        // Emit import (values only)
        if (valueSpecifiers.length > 0) {
          //console.log('valueSpecifiers=', valueSpecifiers)
          declarations.push({
            type: 'ImportDeclaration',
            importKind: 'value',
            specifiers: valueSpecifiers,
            source,
            assertions
          })
        }
        // Emit import type
        if (typeSpecifiers.length > 0) {
          //console.log('typeSpecifiers=', typeSpecifiers)
          declarations.push({
            type: 'ImportDeclaration',
            importKind: 'type',
            specifiers: typeSpecifiers,
            source,
            assertions
          })
        }
        if (nsSpecifier) {
          declarations.push({
            type: 'ImportDeclaration',
            importKind: 'value',
            specifiers: [nsSpecifier],
            source,
            assertions
          })
        }
      } else {
        // All other declarations are passed through as-is
        declarations.push(declaration)
      }
    }
    this.parsed.program.body = declarations
    //console.log(recast.print(this.parsed).code)
    writeFileSync(this.path, recast.print(this.parsed).code)
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
