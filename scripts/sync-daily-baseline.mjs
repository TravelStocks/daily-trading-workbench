import {collectBaseline} from './daily-baseline.mjs';
const arg=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1]};
await collectBaseline({from:arg('--from'),to:arg('--to'),cacheDir:arg('--cache-dir')});
