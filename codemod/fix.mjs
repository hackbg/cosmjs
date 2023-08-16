#!/usr/bin/env node
import { Directory } from './Directory.mjs'
import { TSFile } from './File.mjs'

new Directory()
  .load(['api', 'lib'])
  .patch()
  .save(!!process.argv[2])

console.log()
console.log("Invalid directory imports:", Directory.invalidDirectoryImports)
console.log("Patched type imports:", TSFile.patchedTypeImports)
