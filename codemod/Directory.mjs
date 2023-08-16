import { readdirSync, statSync } from 'node:fs'
import { dirname, resolve, join, sep } from 'node:path'
import assert from 'node:assert'

import { File, TSFile, JSONFile } from './File.mjs'

export class Directory extends Map {
  constructor (path = '.') {
    super()
    console.info(`+ loading dir:    ${path}`)
    if (!statSync(path).isDirectory()) {
      throw new Error(`${path} must be a directory`)
    }
    this.path = path
  }
  /** Recursively load the contents of this directory,
    * (or of specific subdirectories), as well as all
    * subdirectories, and all modules contained within. */
  load (paths = readdirSync(this.path)) {
    for (const name of paths) {
      const path = join(this.path, name)
      const stat = statSync(path)
      if (stat.isFile()) {
        if (name.endsWith('.ts')) {
          console.info(`+ loading TS:     ${path}`)
          this.set(name, new TSFile(path).load())
        } else if (name.endsWith('.json')) {
          console.info(`+ loading JSON:   ${path}`)
          this.set(name, new JSONFile(path).load())
        } else {
          console.info(`~ ignoring:        ${path}`)
        }
      } else if (stat.isDirectory()) {
        this.set(name, new Directory(path).load())
      } else {
        //console.warn(`${path} was not a file or directory`)
      }
    }
    return this
  }
  /** Replace `import` with `import type` where necessary,
    * for all contained files. By default, resolves from
    * this directory. */
  patch (root = this) {
    for (const [path, entry] of this.entries()) {
      entry.patch(root)
    }
    return this
  }
  /** Return the `File` that corresponds to importing `target` from `source`,
    * from the files underneath this `Directory`. */
  resolve (source, target) {
    assert(source instanceof File, 'resolveImport: source must be instance of File')
    if (target.startsWith('.')) {
      return this.resolveRelativeImport(source, target)
    } else {
      return this.resolveModuleImport(source, target)
    }
  }
  /** Resolve relative path imports, i.e. those
    * that do not cross package boundaries. */
  resolveRelativeImport (source, target) {
    // split resolved target path into fragments
    const path = join(dirname(source.path), target)
    const fragments = path.split(sep)
    const visited = []
    let result = this
    while (fragments[0]) {
      // descend:
      let fragment = fragments.shift()
      if (fragments.length > 0) {
        result = result.get(fragment)
      } else {
        // add TS extension to last fragment
        if (result.has(`${fragment}.ts`)) {
          result = result.get(`${fragment}.ts`)
        } else if (result.has(`${fragment}`)) {
          result = result.get(`${fragment}`)
        } else {
          throw new Error(`${fragment} not found in ${visited.join(sep)}`)
        }
      }
      visited.push(fragment)
    }
    // if final result is a directory, look inside its `index.ts`.
    // this is not valid ESM behavior and also needs to be patched.
    if (result instanceof Directory) {
      const defaultFile = 'index.ts'
      console.warn(`  ! ${visited.join(sep)}: is a directory, appending "index.ts"; this is not valid ESM`)
      Directory.invalidDirectoryImports++
      result = result.get(defaultFile)
      if (!result) {
        throw new Error(`${defaultFile} not found in ${visited.join(sep)}`)
      }
      if (!(result instanceof File)) {
        throw new Error(`${defaultFile} found in ${visited.join(sep)} but was not a File`)
      }
    }
    return result
  }
  /** Resolve imports across package boundaries. */
  resolveModuleImport (root, source, target) {
    //console.warn(`  ! imports from packages not supported yet`)
    return null
  }
  /** Counter. */
  static invalidDirectoryImports = 0
  /** Save the contents of the patched files. */
  save (dry = false) {
    for (const [name, entry] of this.entries()) {
      entry.save(dry)
    }
  }
}
