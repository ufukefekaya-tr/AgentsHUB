import { readFileSync } from 'fs';
const src = readFileSync('./node_modules/@google/genai/dist/node/index.mjs', 'utf8');

// Find embedContent region
const embedIdx = src.indexOf('embedContent');
const region = src.slice(embedIdx - 500, embedIdx + 800);
const vMatches = region.match(/(v1beta|v1alpha|\/v1\/)/g);
console.log('=== embedContent API version tags ===');
console.log('Found:', [...new Set(vMatches || [])]);

// Find default API version constant
const versionConst = src.match(/API_VERSION\s*[:=]\s*["'](v1[^"']*)/);
if (versionConst) console.log('API_VERSION const:', versionConst[1]);

// Find httpOptions defaults
const httpMatch = src.match(/httpOptions.*?v1[a-z]*/);
if (httpMatch) console.log('HTTP options API:', httpMatch[0].slice(0,100));

// Check if AQ key changes endpoint
const aqMatch = src.includes('AQ.');
console.log('SDK has AQ key detection:', aqMatch);

// Find base URL used
const urlMatches = [...src.matchAll(/https:\/\/[^\s"']+googleapis[^\s"']+/g)];
const unique = [...new Set(urlMatches.map(m => m[0]))].slice(0, 5);
console.log('API URLs in SDK:', unique);
