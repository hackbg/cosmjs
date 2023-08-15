import { Directory } from './Directory.mjs'
import { TSFile } from './File.mjs'
new Directory().load(['api', 'lib']).patch()

console.log()
console.log("Invalid directory imports:", Directory.invalidDirectoryImports)
console.log("Patched type imports:", TSFile.patchedTypeImports)
