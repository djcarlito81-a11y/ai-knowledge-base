const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = __dirname;
const ACCOUNT_ID = '1245e65402f0b6344ddf160544a12c1f';
const PROJECT = 'ai-knowledge-base';
const TOKEN = 'cfoat_mrzVR15t--SUgTuKSFt0YJrekKXu0c0w1Vzi0GAQoOw.4ISyOwXTegdwAFBINrlH6DRlzvdbGGk6LGtjcotBPGA';

function walkDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(BASE, full).replace(/\\/g, '/');
    if (['.git', '.vercel', '.wrangler', 'node_modules'].includes(entry.name)) continue;
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else {
      const content = fs.readFileSync(full);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      files.push({ path: rel, content: content.toString('base64'), hash, size: content.length });
    }
  }
  return files;
}

async function deploy() {
  const files = walkDir(BASE);
  const manifest = {};
  const payload = {};

  for (const f of files) {
    manifest[`/${f.path}`] = { hash: f.hash, size: f.size };
    payload[`/${f.path}`] = { value: f.content, metadata: { contentType: 'application/octet-stream' }, base64: true };
  }

  console.log(`Uploading ${files.length} files...`);

  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ manifest })
    }
  );

  const data = await resp.json();
  if (!data.success) {
    console.error('Deploy failed:', JSON.stringify(data.errors));
    return;
  }

  console.log('Deployment created:', data.result.url);
}

deploy().catch(console.error);
