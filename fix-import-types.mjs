import recast from 'recast'
import recastTS from './fix-import-types.shim.cjs'
import * as acorn from 'acorn'
import * as acornWalk from 'acorn-walk'
import * as astring from 'astring'

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

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
  constructor (path) {
    super()
    if (!statSync(path).isDirectory()) {
      throw new Error(`${path} must be directory`)
    }
    this.path = path
  }
  load () {
    for (const name of readdirSync(this.path)) {
      const path = resolve(this.path, name)
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
  patch () {
    for (const [path, entry] of this.entries()) {
      console.log(resolve(this.path, path), entry)
      console.log()
    }
    return this
  }
}

class File {
  constructor (path) {
    this.path = path
    this.imports = new Upsertable()
    this.importTypes = new Upsertable()
    this.exports = new Upsertable()
    this.exportTypes = new Upsertable()
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
    const imports = this.imports.getDefault(declaration.source.extra.raw, new Map())
    for (const specifier of declaration.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        //console.log(`    ${specifier.local.name}`)
        imports.set(specifier.local.name, specifier.imported.name)
      } else if (specifier.type === 'ImportDefaultSpecifier') {
        //console.log(`    ${specifier.local.name} (default)`)
        imports.set(specifier.local.name, 'default')
      }
    }
  }
  addExport (declaration) {
    console.log(declaration)
    const exports = this.exports.getDefault(declaration.source.extra.raw, new Map())
    for (const specifier of declaration.specifiers) {
      console.log(`    ${specifier.exported.name}`)
      exports.set(specifier.exported.name, specifier.local.name)
    }
  }
  patch () {
    return this
  }
}

new Directory('./api').load().patch()

//new Directory('./lib').load().patch()
