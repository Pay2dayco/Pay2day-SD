import {scanText} from './boundary-scan.mjs';
// An in-memory non-credential sentinel: never written into public source/artifacts.
const findings=scanText('synthetic.invalid','Bearer '+'SYNTHETIC_NOT_A_CREDENTIAL_000000');
console.log(JSON.stringify(findings));
process.exitCode=findings.length?1:0;
