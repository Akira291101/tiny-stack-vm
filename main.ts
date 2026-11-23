const fs=require('node:fs'),path=require('node:path');
const L=1e6,O=65536,S=256,K=64;
const I=new Int8Array(256).fill(-1),P=new Uint8Array(256),U=new Uint8Array(256);
for(const o of [[0,0,0,0],[1,1,0,1],[2,4,0,1],[3,0,1,0],[4,0,1,2],[5,0,2,2],[6,0,2,3],[7,0,3,3],[16,0,2,1],[17,0,2,1],[18,0,2,1],[19,0,2,1],[20,0,2,1],[21,0,2,1],[22,0,2,1],[23,0,1,1],[24,0,2,1],[25,0,2,1],[26,0,2,1],[27,0,1,1],[28,0,2,1],[29,0,2,1],[30,0,2,1],[32,0,2,1],[33,0,2,1],[34,0,2,1],[48,2,0,0],[49,2,1,0],[50,2,1,0],[51,2,0,0],[52,0,0,0],[64,0,1,1],[65,0,2,0],[80,0,1,0],[81,0,1,0],[82,0,0,1],[83,0,1,0]]){I[o[0]]=o[1];P[o[0]]=o[2];U[o[0]]=o[3];}
function run(p,b){
const n=p.length,D=new Int32Array(S),C=new Int32Array(K),M=new Int32Array(256),o=Buffer.alloc(O);
let s=0,c=0,l=0,q=0,x=0,z=0;
const d=e=>({stdout:o.subarray(0,l),exit:e}),t=d;
for(;;){
if(z===L)return t(10);
if(x<0||x>=n)return t(9);
const op=p[x],i=I[op];
if(i<0)return t(5);
if(x+i>=n)return t(9);
z++;
const y=x+1+i;
if(s<P[op])return t(2);
if(s-P[op]+U[op]>S)return t(3);
x=y;
switch(op){
case 0:return d(0);
case 1:D[s++]=(p[y-1]<<24)>>24;break;
case 2:D[s++]=p[y-4]|p[y-3]<<8|p[y-2]<<16|p[y-1]<<24;break;
case 3:s--;break;
case 4:D[s]=D[s-1];s++;break;
case 5:{const v=D[s-1];D[s-1]=D[s-2];D[s-2]=v;break}
case 6:D[s]=D[s-2];s++;break;
case 7:{const v=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=v;break}
case 23:D[s-1]=-D[s-1]|0;break;
case 27:D[s-1]=~D[s-1];break;
case 48:case 49:case 50:{
const r=((p[y-2]|p[y-1]<<8)<<16)>>16;
let k=!0;
if(op!==48){const v=D[--s];k=op===49?v===0:v!==0}
if(k)x=y+r;
break}
case 51:
if(c===K)return t(7);
C[c++]=y;x=p[y-2]|p[y-1]<<8;break;
case 52:
if(c===0)return t(8);
x=C[--c];break;
case 64:{
const a=D[s-1];
if(a<0||a>=256)return t(6);
D[s-1]=M[a];break}
case 65:{
const a=D[s-1],v=D[s-2];
if(a<0||a>=256)return t(6);
s-=2;M[a]=v;break}
case 80:{
const w=Buffer.from(String(D[s-1]),'utf8');
if(l+w.length>O)return t(11);
s--;w.copy(o,l);l+=w.length;break}
case 81:
if(l+1>O)return t(11);
o[l++]=D[--s]&255;break;
case 82:D[s++]=q<b.length?b[q++]:-1;break;
case 83:return d(D[--s]&255);
default:{
const v=D[s-1],a=D[s-2];
if(op>=19&&op<=22&&v===0)return t(4);
let r;
switch(op){
case 16:r=(a+v)|0;break;
case 17:r=(a-v)|0;break;
case 18:r=Math.imul(a,v);break;
case 19:r=a===-2147483648&&v===-1?a:(a/v)|0;break;
case 20:r=v===-1?0:a%v|0;break;
case 21:r=Math.floor((a>>>0)/(v>>>0))|0;break;
case 22:r=(a>>>0)%(v>>>0)|0;break;
case 24:r=a&v;break;
case 25:r=a|v;break;
case 26:r=a^v;break;
case 28:r=a<<(v&31);break;
case 29:r=a>>(v&31);break;
case 30:r=(a>>>(v&31))|0;break;
case 32:r=a===v?1:0;break;
case 33:r=a<v?1:0;break;
default:r=(a>>>0)<(v>>>0)?1:0
}
s-=2;D[s++]=r;break
}
}
}
}
const A=process.env.MAKEFUN_INPUT_DIR||'/input',B=process.env.MAKEFUN_OUTPUT_DIR||'/output';
fs.mkdirSync(B,{recursive:true});
for(const f of fs.readdirSync(A)){
const j=path.join(A,f);
if(!fs.statSync(j).isDirectory())continue;
const g=new Uint8Array(fs.readFileSync(path.join(j,'program.bin')));
const h=new Uint8Array(fs.readFileSync(path.join(j,'input.bin')));
const r=run(g,h),v=path.join(B,f);
fs.mkdirSync(v,{recursive:true});
fs.writeFileSync(path.join(v,'stdout.bin'),r.stdout);
fs.writeFileSync(path.join(v,'exit.txt'),`${r.exit}\n`);
}
