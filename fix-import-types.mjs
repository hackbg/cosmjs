import recast from 'recast'
import recastTS from './fix-import-types.shim.cjs'
import * as acorn from 'acorn'
import * as acornWalk from 'acorn-walk'
import * as astring from 'astring'

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve, join, sep } from 'node:path'
import assert from 'node:assert'

class Upsertable extends Map {
  getDefault (key, def) {
    if (this.has(key)) {
      return this.get(key)
    } else {
      this.set(key, def)
      return def
    }
  }
}

class Directory extends Map {
  constructor (path = '.') {
    super()
    if (!statSync(path).isDirectory()) {
      throw new Error(`${path} must be directory`)
    }
    this.path = path
  }
  load (paths = readdirSync(this.path)) {
    for (const name of paths) {
      const path = join(this.path, name)
      const stat = statSync(path)
      if (stat.isFile() && name.endsWith('.ts')) {
        this.set(name, new File(path).load())
      } else if (stat.isDirectory()) {
        this.set(name, new Directory(path).load())
      } else {
        //console.warn(`${path} was not a file or directory`)
      }
    }
    return this
  }
  patch (root = this) {
    for (const [path, entry] of this.entries()) {
      entry.patch(root)
    }
    return this
  }
  resolve (source, target) {
    if (target.startsWith('.')) {
      assert(statSync(source).isFile(), `${source} must be a file`)
      let path = join(dirname(source), target)
      const fragments = path.split(sep)
      let result = this
      console.log(fragments)
      while (fragments[0]) {
        result = result.get(fragments.shift())
      }
      if (result instanceof Directory) {
        result = result.get('index.ts')
      }
      console.log(result)
      assert(fragments.length === 0, `${source} must not have subdirs`)
      return result
    } else {
      console.warn(`${source} -> ${target}: not supported yet`)
      return null
    }
  }
}

class File {
  constructor (path) {
    this.path = path
    this.imports = new Upsertable()
    this.importTypes = new Upsertable()
    this.exports = new Set()
    this.exportTypes = new Set()
  }
  load () {
    const source = readFileSync(this.path)
    const parsed = recast.parse(source, { parser: recastTS })
    console.log(`${this.path}:`)
    for (const declaration of parsed.program.body) {
      //console.log(declaration)
      if (declaration.type === 'ImportDeclaration') {
        //console.log(`  imported (${declaration.importKind}) from ${declaration.source.extra.raw}:`)
        this.addImport(declaration)
      }
      if (declaration.type === 'ExportNamedDeclaration') {
        //console.log(`  exported (${declaration.exportKind}) from ${declaration.source.extra.raw}:`)
        this.addExport(declaration)
      }
    }
    return this
  }
  addImport (declaration) {
    const imports = ((declaration.importKind === 'type')
      ? this.importTypes
      : this.imports
    ).getDefault(declaration.source.value, new Map())
    for (const specifier of declaration.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        imports.set(specifier.local.name, specifier.imported.name)
      } else if (specifier.type === 'ImportDefaultSpecifier') {
        imports.set(specifier.local.name, 'default')
      }
    }
  }
  addExport (declaration) {
    const exports = (declaration.exportKind === 'type')
      ? this.exportTypes
      : this.exports
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
  patch (root) {
    for (const [source, specifiers] of this.imports.entries()) {
      const resolved = root.resolve(this.path, source)
    }
    for (const [source, specifiers] of this.importTypes.entries()) {
    }
    return this
  }
}

new Directory()
  .load(['api', 'lib'])
  .patch()
