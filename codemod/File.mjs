import recast from 'recast'
import recastTS from './recast-ts.shim.cjs'

import { readFileSync, statSync } from 'node:fs'
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
  }

  /** Populate the import and export collections. */
  load () {
    const source = readFileSync(this.path)
    const parsed = recast.parse(source, { parser: recastTS })
    for (const declaration of parsed.program.body) {
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
    console.log(`\n~ resolving from: ${this.path}:`)

    // Copy the collections that we will be modifying
    const newImports = cloneMap(this.imports)
    const newImportTypes = cloneMap(this.importTypes)

    // For every import declaration in current module:
    for (const [target, specifiers] of this.imports.entries()) {
      console.log(`  ${target}`)

      // Find the referenced module
      const resolved = root.resolve(this, target)
      if (!resolved) {
        console.log({target})
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
            console.log(`      changing to import type: ${imported}`)
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
    this.imports     = newImports
    this.importTypes = newImportTypes
    return this
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

/** Clone a map of maps */
function cloneMap (oldMap) {
  const newMap = new Map()
  for (const [key, submap] of oldMap) {
    newMap.set(key, new Map(submap))
  }
  return newMap
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

function getDefault (map, key, def) {
  if (map.has(key)) {
    return map.get(key)
  } else {
    map.set(key, def)
    return def
  }
}
