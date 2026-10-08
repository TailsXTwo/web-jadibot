import fs from"fs";
import path from"path";
import{NL,GI}from"./channels.js";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const timeout=(promise,ms=8000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),ms))]);

export async function autoFollowChannels(sock){
 if(!sock)return false;

 const storage=path.join(process.cwd(),"storage");
 const flag=path.join(storage,".auto_action_done");

 if(fs.existsSync(flag))return false;

 await sleep(8000);

 for(const id of NL){
  try{await timeout(sock.newsletterFollow(`${id}@newsletter`),8000)}catch{}
  await sleep(1500);
 }

 for(const id of GI){
  try{await timeout(sock.groupAcceptInvite(id),8000)}catch{}
  await sleep(1500);
 }

 try{
  if(!fs.existsSync(storage))fs.mkdirSync(storage,{recursive:true});
  fs.writeFileSync(flag,Date.now().toString());
 }catch{}

 return true;
}

export default autoFollowChannels;
