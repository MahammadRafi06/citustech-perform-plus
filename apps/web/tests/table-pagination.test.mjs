import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const temp=mkdtempSync(join(tmpdir(),'perform-pagination-'));
symlinkSync(fileURLToPath(new URL('../node_modules',import.meta.url)),join(temp,'node_modules'),'dir');
for(const name of ['components/table-pagination.tsx','components/sortable-table.tsx','lib/table-sorting.ts']){
 const source=readFileSync(new URL(`../src/${name}`,import.meta.url),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  .replaceAll("'@/lib/table-sorting'","'./table-sorting.mjs'").replaceAll("'./sortable-table'","'./sortable-table.mjs'")
  .replaceAll('"@/lib/api"','"./api.mjs"').replaceAll('"./ui/button"','"./button.mjs"');
 writeFileSync(join(temp,name.split('/').at(-1).replace(/\.tsx?$/,'.mjs')),output);
}
writeFileSync(join(temp,'api.mjs'),'export const num=n=>n.toLocaleString("en-US");');
writeFileSync(join(temp,'button.mjs'),'import React from "react"; export function Button({variant,size,...props}){return React.createElement("button",props);}');
const {PaginatedTable}=await import(pathToFileURL(join(temp,'table-pagination.mjs')));
process.on('exit',()=>rmSync(temp,{recursive:true,force:true}));
const h=React.createElement;

test('data-backed pagination constructs only 50 rows for the full EDS population',()=>{
 const rows=Array.from({length:14903},(_,i)=>({id:i,name:`Member ${i}`})),rendered=[];
 const html=renderToStaticMarkup(h(PaginatedTable,{rows,label:'Encounter Records',sortValue:(r)=>r.name,headers:h('th',null,'Member'),children:r=>{rendered.push(r.id);return h('tr',{key:r.id},h('td',null,r.name));}}));
 assert.deepEqual(rendered,Array.from({length:50},(_,i)=>i));
 assert.match(html,/14,903 records/);assert.match(html,/Page 1 of 299/);
 assert.match(html,/Sort ascending/);assert.equal((html.match(/<tr/g)||[]).length,51);
});

test('legacy rendered-cell tables retain sorting and pagination controls',()=>{
 const rows=Array.from({length:60},(_,i)=>i);
 const html=renderToStaticMarkup(h(PaginatedTable,{rows,label:'Legacy',headers:h('th',null,'Value'),children:i=>h('tr',{key:i},h('td',null,i))}));
 assert.equal((html.match(/<tr/g)||[]).length,51);assert.match(html,/60 records/);assert.match(html,/Sort ascending/);
});
