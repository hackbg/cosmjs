import recast from 'recast'
import recastTS from './recast-ts.shim.cjs'

import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/** Represents a TypeScript module. */
export class File {

  constructor (path) {
    if (!statSync(path).isFile()) {
      throw new Error(`${path} must be a file`)
    }
    this.path = path
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
    for (const [target, specifiers] of this.imports.entries()) {
      const resolved = root.resolve(this, target)
      for (const specifier of specifiers) {
      }
    }
    return this
  }

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

function getDefault (map, key, def) {
  if (map.has(key)) {
    return map.get(key)
  } else {
    map.set(key, def)
    return def
  }
}
