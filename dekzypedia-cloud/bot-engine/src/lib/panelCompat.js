import fs from "fs";
import path from "path";
import appConfig from "../../config.js";
import { getDatabase } from "./database.js";
export const VALID_SERVERS=["v1","v2","v3","v4","v5"];
export const isLid=jid=>String(jid||"").endsWith("@lid");
export const lidToJid=jid=>String(jid||"").replace(/@lid$/,"@s.whatsapp.net");
export const cleanNumber=jid=>String(isLid(jid)?lidToJid(jid):jid||"").replace(/@.*$/," ").replace(/[^0-9]/g,"").trim();
const ROLE_FILE=path.join(process.cwd(),"database","cpanel","roles.json");
const DEFAULT_ROLES=Object.fromEntries(VALID_SERVERS.map(v=>[v,{owner:[],ceo:[],reseller:[]}]));
function readRoles(){try{if(!fs.existsSync(ROLE_FILE))return structuredClone(DEFAULT_ROLES);const data=JSON.parse(fs.readFileSync(ROLE_FILE,"utf8"));for(const v of VALID_SERVERS)data[v]??={owner:[],ceo:[],reseller:[]};return data}catch{return structuredClone(DEFAULT_ROLES)}}
function writeRoles(data){fs.mkdirSync(path.dirname(ROLE_FILE),{recursive:true});fs.writeFileSync(ROLE_FILE,JSON.stringify(data,null,2))}
export function getRoles(){return readRoles()}
export function getUserRole(sender,server){const n=cleanNumber(sender),v=String(server).toLowerCase(),cfg=appConfig.pterodactyl||{};if(appConfig.isOwner?.(n)||appConfig.owner?.number?.map(String).includes(n))return "owner";if((cfg.ownerPanels||[]).map(String).includes(n))return "owner";const roles=readRoles()[v]||{};if((roles.owner||[]).map(String).includes(n))return "owner";if((roles.ceo||[]).map(String).includes(n))return "ceo";if((roles.reseller||[]).map(String).includes(n))return "reseller";return null}
export function hasAccessToServer(sender,server,isOwner=false){return !!isOwner||!!getUserRole(sender,server)}
export function hasFullAccess(sender,server,isOwner=false){if(isOwner)return true;const r=getUserRole(sender,server);return r==="owner"||r==="ceo"}
export function getAccessibleServers(sender){return VALID_SERVERS.map(server=>({server,role:getUserRole(sender,server)})).filter(x=>x.role)}
export function canManageRole(sender,server,targetRole,isOwner=false){if(isOwner)return true;const role=getUserRole(sender,server);const rank={owner:3,ceo:2,reseller:1};return !!role&&rank[role]>=rank[targetRole]&&role!=="reseller"}
export function addRole(jid,server,role){const n=cleanNumber(jid),v=String(server).toLowerCase(),r=String(role).toLowerCase();if(!VALID_SERVERS.includes(v)||!['owner','ceo','reseller'].includes(r))return{success:false,error:"Role/server tidak valid."};const data=readRoles();for(const x of ['owner','ceo','reseller'])data[v][x]=(data[v][x]||[]).filter(nr=>nr!==n);data[v][r].push(n);writeRoles(data);return{success:true}}
export function removeRole(jid,server,role){const n=cleanNumber(jid),v=String(server).toLowerCase(),r=String(role).toLowerCase(),data=readRoles();if(!data[v]?.[r]?.includes(n))return{success:false,error:`Nomor ${n} tidak terdaftar sebagai ${r}.`};data[v][r]=data[v][r].filter(x=>x!==n);writeRoles(data);return{success:true}}
export function listByRole(server,role){const data=readRoles();return data[String(server).toLowerCase()]?.[String(role).toLowerCase()]||[]}
export function checkPanelJeda(){const db=getDatabase(),jeda=Number(db.setting("panelCreateJeda")??300000),last=Number(db.setting("panelCreateLastUsed")??0);if(jeda<=0)return{allowed:true,remaining:0,message:""};const remaining=jeda-(Date.now()-last);if(remaining>0)return{allowed:false,remaining,message:`⏱️ *JEDA CREATE PANEL*\n\n> Tunggu *${formatDuration(remaining)}* lagi sebelum create panel berikutnya.`};return{allowed:true,remaining:0,message:""}}
export function setPanelLastUsed(){const db=getDatabase();db.setting("panelCreateLastUsed",Date.now())}
export function formatDuration(ms){const s=Math.ceil(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);if(h)return`${h} jam ${m%60} menit`;if(m)return`${m} menit ${s%60} detik`;return`${s} detik`}
export function formatDateTime(fmt="D MMMM YYYY HH:mm"){const d=new Date(),months=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];return fmt.replace("D",d.getDate()).replace("MMMM",months[d.getMonth()]).replace("YYYY",d.getFullYear()).replace("HH",String(d.getHours()).padStart(2,"0")).replace("mm",String(d.getMinutes()).padStart(2,"0"))}
export function te(prefix,command,pushName){return`❌ Terjadi kesalahan saat menjalankan *${prefix||"."}${command||"fitur"}*.${pushName?`\n\n> ${pushName}`:""}`}
export function getText(m,ctx={}){if(Array.isArray(ctx.args)&&ctx.args.length)return ctx.args.join(" ").trim();if(Array.isArray(m?.args)&&m.args.length)return m.args.join(" ").trim();return String(ctx.text??m?.text??m?.body??m?.message?.conversation??m?.message?.extendedTextMessage?.text??"").trim()}
export default{VALID_SERVERS,isLid,lidToJid,cleanNumber,getRoles,getUserRole,hasAccessToServer,hasFullAccess,getAccessibleServers,canManageRole,addRole,removeRole,listByRole,checkPanelJeda,setPanelLastUsed,formatDuration,formatDateTime,te,getText};
