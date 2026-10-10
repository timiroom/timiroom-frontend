import test from "node:test";
import assert from "node:assert/strict";
import { aiConnectionLink, connectionRows } from "./aiConnectionLinks.mjs";

test("both supported clients remain visible without grants", () => {
  assert.deepEqual(connectionRows([]).map(row => [row.clientId, row.grants.length]), [["timiroom-codex", 0], ["timiroom-claude", 0]]);
});
test("only active grants count and all connections for one client are grouped", () => {
  const rows = connectionRows([{clientId:"timiroom-codex",active:false,connectionId:"old"},{clientId:"timiroom-codex",active:true,connectionId:"a"},{clientId:"timiroom-codex",active:true,connectionId:"b"}]);
  assert.deepEqual(rows[0].grants.map(grant=>grant.connectionId),["a","b"]);
  assert.equal(rows[1].grants.length,0);
});
test("official deep links carry executable setup requests with fixed OAuth clients", () => {
  const codex=new URL(aiConnectionLink("timiroom-codex","https://api.timiroom.kro.kr"));
  assert.equal(codex.protocol,"codex:");assert.equal(codex.hostname,"threads");assert.equal(codex.pathname,"/new");
  assert.match(codex.searchParams.get("prompt"),/codex mcp login timiroom/);
  assert.match(codex.searchParams.get("prompt"),/56381/);
  const claude=new URL(aiConnectionLink("timiroom-claude","https://api.timiroom.kro.kr"));
  assert.equal(claude.protocol,"claude:");assert.equal(claude.hostname,"code");assert.equal(claude.pathname,"/new");
  assert.match(claude.searchParams.get("q"),/--client-id timiroom-claude --callback-port 56382/);
  assert.match(claude.searchParams.get("q"),/claude mcp login timiroom/);
});
test("unknown clients and unsafe endpoint origins are rejected", () => {
  for(const base of ["http://evil.example","https://user:secret@example.com","https://api.example.com/?token=secret","javascript:alert(1)"]) {
    assert.throws(()=>aiConnectionLink("timiroom-codex",base));
  }
  assert.throws(()=>aiConnectionLink("unknown","https://api.timiroom.kro.kr"));
});
