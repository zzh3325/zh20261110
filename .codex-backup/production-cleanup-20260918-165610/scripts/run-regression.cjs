const esbuild = require('node:module').createRequire(require.resolve('vite'))('esbuild')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const {spawnSync} = require('node:child_process')
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'daqiao-regression-'))
const output = path.join(temporary, 'tests.cjs')
try {
  esbuild.buildSync({
    entryPoints:[path.join(__dirname,'regression.ts')],outfile:output,
    bundle:true,platform:'node',format:'cjs',
    define:{'import.meta.env':'{}'},
    alias:{'@':path.resolve(__dirname,'../src')}
  })
  const result = spawnSync(process.execPath,[output],{stdio:'inherit'})
  process.exitCode = result.status ?? 1
} finally {
  fs.rmSync(output, {force:true})
  fs.rmdirSync(temporary)
}
