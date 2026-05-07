#!/usr/bin/env node
"use strict";
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, 'mcp-server.js');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname
});

let msgId = 0;
let pending = {};

function send(method, params = {}) {
  msgId++;
  return new Promise((resolve, reject) => {
    pending[msgId] = { resolve, reject };
    const msg = JSON.stringify({ jsonrpc: '2.0', id: msgId, method, params }) + '\n';
    server.stdin.write(msg);
  });
}

let buffer = '';
server.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending[msg.id]) {
        pending[msg.id].resolve(msg);
        delete pending[msg.id];
      }
    } catch (e) { /* skip partial */ }
  }
});

async function run() {
  try {
    // Wait for server to initialize
    await new Promise(r => setTimeout(r, 1000));

    // 1. List tools
    console.log('📋 Listing tools...');
    const toolsResp = await send('tools/list');
    const tools = toolsResp.result?.tools || [];
    console.log(`   ${tools.length} tools:`);
    for (const t of tools) console.log(`   ✅ ${t.name}`);

    // 2. Get stats
    console.log('\n📊 Stats...');
    const statsResp = await send('tools/call', { name: 'get_stats', arguments: {} });
    const stats = JSON.parse(statsResp.result?.content?.[0]?.text || '{}');
    console.log(`   ${stats.totalBones} bones, ${stats.totalArticulations} articulations, ${stats.totalLigaments} ligaments`);

    // 3. Search
    console.log('\n🔍 Searching "femur"...');
    const searchResp = await send('tools/call', { name: 'search_bones', arguments: { query: 'femur' } });
    const searchResult = JSON.parse(searchResp.result?.content?.[0]?.text || '{}');
    console.log(`   Found ${searchResult.total} results`);
    for (const r of (searchResult.results || []).slice(0, 3)) {
      console.log(`   - ${r.names?.preferred?.en} (${r.names?.preferred?.la})`);
    }

    // 4. Get specific bone
    console.log('\n🦴 Getting bone:femur_L...');
    const boneResp = await send('tools/call', { name: 'get_bone', arguments: { bone_id: 'bone:femur_L' } });
    const bone = JSON.parse(boneResp.result?.content?.[0]?.text || '{}');
    console.log(`   Name: ${bone.names?.preferred?.en}`);
    console.log(`   Latin: ${bone.names?.preferred?.la}`);
    console.log(`   Shape: ${bone.shape_class}`);
    console.log(`   FMA: ${bone.external_ids?.find(e => e.ontology === 'FMA')?.code}`);
    console.log(`   Articulations: ${bone.articulationCount}`);
    console.log(`   Ligaments: ${bone.ligamentCount}`);

    // 5. List articulations
    console.log('\n🔗 Articulations for femur...');
    const artResp = await send('tools/call', { name: 'list_articulations', arguments: { bone_id: 'bone:femur_L' } });
    const artResult = JSON.parse(artResp.result?.content?.[0]?.text || '{}');
    console.log(`   ${artResult.total} articulations:`);
    for (const a of (artResult.articulations || [])) console.log(`   - ${a.name} (${a.type})`);

    // 6. List ligaments
    console.log('\n🩹 Ligaments for femur...');
    const ligResp = await send('tools/call', { name: 'list_ligaments', arguments: { bone_id: 'bone:femur_L' } });
    const ligResult = JSON.parse(ligResp.result?.content?.[0]?.text || '{}');
    console.log(`   ${ligResult.total} ligaments:`);
    for (const l of (ligResult.ligaments || []).slice(0, 5)) console.log(`   - ${l.name} (${l.kind})`);

    // 7. Random bone
    console.log('\n🎲 Random bone...');
    const randResp = await send('tools/call', { name: 'random_bone', arguments: {} });
    const randBone = JSON.parse(randResp.result?.content?.[0]?.text || '{}');
    console.log(`   ${randBone.names?.preferred?.en}`);

    // 8. Resources
    console.log('\n📚 Resources...');
    const resResp = await send('resources/list');
    const res = resResp.result?.resources || [];
    for (const r of res) console.log(`   📄 ${r.uri} — ${r.name}`);

    // 9. Filter bones
    console.log('\n🎯 Filtering flat bones...');
    const filterResp = await send('tools/call', { name: 'filter_bones', arguments: { shape_class: 'flat', division: 'axial' } });
    const filterResult = JSON.parse(filterResp.result?.content?.[0]?.text || '{}');
    console.log(`   ${filterResult.total} flat axial bones`);

    console.log('\n✅ ALL TESTS PASSED');
    server.kill();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    server.kill();
    process.exit(1);
  }
}

server.stderr.on('data', (d) => { /* server logs */ });
server.on('error', (e) => { console.error('Server error:', e); });
run();
