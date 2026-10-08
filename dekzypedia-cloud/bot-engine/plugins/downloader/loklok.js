import * as scraper from "../../src/lib/scraper/loklok.js";

const config={
  name:"loklok",
  alias:["loklokdl","lokloksearch"],
  category:"downloader",
  description:"Scraper loklok untuk Shinobu",
  usage:".loklok <query/url>",
  example:".loklok example",
  cooldown:5,
  energi:1
};

function getFunction(){
  const names=[
    "search",
    "search",
    "download",
    "scrape",
    "run",
    "main",
    "fetchData",
    "getData"
  ];

  for(const name of names){
    if(typeof scraper[name]==="function"){
      return scraper[name];
    }
  }

  if(typeof scraper.default==="function"){
    return scraper.default;
  }

  if(scraper.default&&typeof scraper.default==="object"){
    for(const name of names){
      if(typeof scraper.default[name]==="function"){
        return scraper.default[name];
      }
    }
  }

  return null;
}

async function handler(m,{sock}){
  const text=String(m.text||m.body||"").trim();

  if(!text){
    return m.reply("❌ Masukkan query atau URL.");
  }

  try{
    await m.react("🔎").catch(()=>{});

    const fn=getFunction();

    if(!fn){
      return m.reply(
        "❌ Function scraper tidak ditemukan.\n\n"+
        "Export: nav, home, search, episodes, stream, default"
      );
    }

    let result;

    try{
      result=await fn(text);
    }catch(firstError){
      result=await fn({
        query:text,
        url:text,
        text
      });
    }

    let output;

    if(typeof result==="string"){
      output=result;
    }else{
      try{
        output=JSON.stringify(result,null,2);
      }catch{
        output=String(result);
      }
    }

    await m.reply(
      "╭─「 *LOKLOK SCRAPER* 」\n"+
      "│ 🔎 Query: "+text+"\n"+
      "╰────────────\n\n"+
      output
    );

    await m.react("✅").catch(()=>{});
  }catch(error){
    console.error("[LOKLOK]",error);
    await m.react("❌").catch(()=>{});

    await m.reply(
      "❌ Scraper error.\n"+
      (error?.message||"Unknown error")
    );
  }
}

export default {config,handler};
