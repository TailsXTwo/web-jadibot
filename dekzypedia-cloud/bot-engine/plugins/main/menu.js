// plugins/main/menu.js
import fs from "node:fs";
import sharp from "sharp";
import appConfig from "../../config.js";
import {generateWAMessageFromContent} from "@itsliaaa/baileys";
import {getCategories,getCommandsByCategory} from "../../src/lib/plugins.js";
import {formatUptime,getTimeGreeting} from "../../src/lib/formatter.js";

const config={
  name:"menu",
  alias:["help","menuall","menucat"],
  category:"main",
  description:"Menampilkan menu utama bot (mendukung kategori)",
  usage:".menu [kategori]",
  example:".menu ai",
  isOwner:false,
  isPremium:false,
  isGroup:false,
  isPrivate:false,
  cooldown:3,
  energi:0,
  isEnabled:true
};

const CATEGORY_META={
  ai:{label:"Ai",marker:"〄"},
  main:{label:"Core",marker:"〄"},
  owner:{label:"Owner",marker:"〄"},
  dev:{label:"Dev",marker:"〄"},
  download:{label:"Downloader",marker:"〄"},
  downloader:{label:"Downloader",marker:"〄"},
  fun:{label:"Fun",marker:"〄"},
  game:{label:"Games",marker:"〄"},
  games:{label:"Games",marker:"〄"},
  group:{label:"Group",marker:"〄"},
  info:{label:"Info",marker:"〄"},
  islamic:{label:"Islami",marker:"〄"},
  maker:{label:"Maker",marker:"〄"},
  search:{label:"Search",marker:"〄"},
  tools:{label:"Tools",marker:"〄"},
  utility:{label:"Utility",marker:"〄"},
  sticker:{label:"Sticker",marker:"〄"},
  media:{label:"Media",marker:"〄"},
  music:{label:"Music",marker:"〄"},
  other:{label:"Other",marker:"〄"},
  lainnya:{label:"Other",marker:"〄"}
};

const CATEGORY_ORDER=[
  "main","owner","ai","dev","download","downloader",
  "fun","games","game","group","info","islamic","maker",
  "search","tools","utility","sticker","media","music","other"
];

const SALURAN={
  name:global.info?.namebot||"Shinobu-Asistant",
  id:"120363427915199733@newsletter"
};

const getPrefix=(m,botConfig)=>
  m?.prefix||
  botConfig?.command?.prefix||
  appConfig?.command?.prefix||
  ".";

function getForwardContext(mentions=[]){
  return{
    mentionedJid:mentions,
    forwardingScore:9999,
    isForwarded:true,
    forwardedNewsletterMessageInfo:{
      newsletterJid:SALURAN.id,
      newsletterName:SALURAN.name,
      serverMessageId:127
    }
  };
}

function metaFor(category){
  const cat=String(category||"other").toLowerCase();
  return CATEGORY_META[cat]||{
    label:cat.charAt(0).toUpperCase()+cat.slice(1),
    marker:"〄"
  };
}

function sortedCategories(){
  const cats=[
    ...new Set(
      (getCategories()||[])
        .map(c=>String(c).toLowerCase())
    )
  ];

  return cats.sort((a,b)=>{
    const ia=CATEGORY_ORDER.indexOf(a);
    const ib=CATEGORY_ORDER.indexOf(b);
    return(ia===-1?999:ia)-(ib===-1?999:ib);
  });
}

function totalCommandCount(commandsByCategory){
  return Object.values(commandsByCategory||{})
    .reduce((sum,list)=>sum+(list?.length||0),0);
}

function bodyText({
  botName,
  developer,
  version,
  mode,
  prefix,
  pushName,
  sender,
  totalCommands
}){
  const number=String(sender||"").split("@")[0]||"-";

  return[
    `╭─❍ *${botName.toUpperCase()}* ❍─╮`,
    "",
    `${getTimeGreeting()}, *${pushName||"Kak"}*! 🌱`,
    "Selamat datang di menu utama.",
    "",
    "┌─「 INFORMASI BOT 」",
    `│ 👤 User      : @${number}`,
    `│ 👨‍💻 Developer  : ${developer}`,
    `│ 🏷️ Version    : ${version}`,
    `│ ⏱️ Uptime     : ${formatUptime(process.uptime())}`,
    `│ ⚙️ Mode       : ${mode}`,
    `│ 📌 Prefix     : ${prefix}`,
    `│ 📦 Total Fitur: ${totalCommands} command`,
    "└──────────────────",
    "",
    `📚 Tekan tombol *Pilih Kategori* di bawah,`,
    `   atau ketik *${prefix}menu <kategori>* manual.`
  ].join("\n");
}

async function makeThumbnail(imagePath){
  if(!imagePath||!fs.existsSync(imagePath))return null;

  try{
    return await sharp(fs.readFileSync(imagePath))
      .resize(300,300,{fit:"cover",position:"center"})
      .jpeg({quality:85})
      .toBuffer();
  }catch(e){
    console.error("[MENU THUMB ERROR]",e?.message||e);
    return null;
  }
}

function getVerifiedQuoted(botConfig,m,sock){
  let number=
    botConfig?.ownerNumber||
    botConfig?.owner||
    botConfig?.bot?.number||
    appConfig?.ownerNumber||
    appConfig?.owner||
    appConfig?.bot?.number||
    "";

  if(Array.isArray(number))number=number[0];

  if(typeof number==="object"&&number!==null){
    number=
      number.number||
      number.jid||
      number.id||
      "";
  }

  number=String(number).replace(/[^0-9]/g,"");

  if(!number&&sock?.user?.id){
    number=String(sock.user.id)
      .split(":")[0]
      .split("@")[0]
      .replace(/[^0-9]/g,"");
  }

  const jid=
    number?
    `${number}@s.whatsapp.net`:
    "0@s.whatsapp.net";

  const botName=
    botConfig?.bot?.name||
    botConfig?.botName||
    appConfig?.bot?.name||
    "SHINOBU-ASISTANT";

  return{
    key:{
      participant:jid,
      remoteJid:"status@broadcast",
      fromMe:false,
      id:"SHINOBU-MENU"
    },
    message:{
      contactMessage:{
        displayName:botName,
        vcard:
          `BEGIN:VCARD\n`+
          `VERSION:3.0\n`+
          `N:XL;${botName};;;\n`+
          `FN:${botName}\n`+
          `item1.TEL;waid=${number}:${number}\n`+
          `item1.X-ABLabel:Ponsel\n`+
          `END:VCARD`,
        sendEphemeral:true
      }
    }
  };
}

function buildRows(prefix,categories,commandsByCategory){
  const rows=categories.map(cat=>{
    const meta=metaFor(cat);
    const count=(commandsByCategory?.[cat]||[]).length;

    return{
      header:"",
      title:`${meta.marker} ${meta.label}`,
      description:`${count} command`,
      id:`${prefix}menu ${cat}`
    };
  });

  rows.push(
    {
      header:"",
      title:"〄 All Menu",
      description:"Semua command sekaligus",
      id:`${prefix}allmenu`
    },
    {
      header:"",
      title:"〄 Owner Profile",
      description:"Informasi owner bot",
      id:`${prefix}owner`
    }
  );

  return rows;
}

async function sendTagCard(
  sock,
  m,
  {
    botConfig,
    botName,
    text,
    prefix,
    categories,
    commandsByCategory,
    imagePath,
    thumbPath
  }
){
  const selectedImage=[
    imagePath,
    thumbPath
  ].find(p=>p&&fs.existsSync(p));

  if(!selectedImage){
    throw new Error(
      "File menu-image/menu-thumb tidak ditemukan"
    );
  }

  const thumbnail=await makeThumbnail(selectedImage);

  if(!thumbnail){
    throw new Error(
      "Gagal membuat thumbnail menu"
    );
  }

  const sender=
    String(m.sender||"").split("@")[0]||"-";

  const rows=
    buildRows(
      prefix,
      categories,
      commandsByCategory
    );

  const date=
    new Date().toLocaleDateString(
      "id-ID",
      {
        day:"2-digit",
        month:"long",
        year:"numeric"
      }
    );

  const verifiedQuoted=
    getVerifiedQuoted(
      botConfig,
      m,
      sock
    );

  const content={
    buttonsMessage:{
      locationMessage:{
        degreesLatitude:0,
        degreesLongitude:0,
        name:botName,
        address:`📍${date}`,
        jpegThumbnail:thumbnail
      },
      contentText:
        `haloo ${m.pushName||"Kak"} @${sender}`,
      footerText:text,
      buttons:[
        {
          buttonId:`${prefix}allmenu`,
          buttonText:{
            displayText:"☰ allmenu"
          },
          nativeFlowInfo:{
            name:"single_select",
            paramsJson:JSON.stringify({
              title:"All Menu",
              sections:[
                {
                  title:botName,
                  highlight_label:"🔥",
                  rows
                }
              ]
            })
          },
          type:1
        },
        {
          buttonId:`${prefix}owner`,
          buttonText:{
            displayText:"⌕ owner"
          },
          type:1
        }
      ],
      headerType:6,
      contextInfo:getForwardContext(
        m.sender?[m.sender]:[]
      )
    }
  };

  const generated=
    generateWAMessageFromContent(
      m.chat,
      content,
      {
        quoted:verifiedQuoted,
        userJid:
          sock.user?.id||
          sock.user?.jid
      }
    );

  await sock.relayMessage(
    m.chat,
    generated.message,
    {
      messageId:generated.key.id
    }
  );
}

async function sendCategoryMenu(
  m,
  {config:botConfig},
  categoryInput
){
  const prefix=
    getPrefix(m,botConfig);

  const requested=
    String(categoryInput||"")
      .toLowerCase()
      .trim();

  const commandsByCategory=
    getCommandsByCategory()||{};

  const available=
    sortedCategories();

  const match=
    available.find(c=>c===requested)||
    available.find(
      c=>
        metaFor(c)
          .label
          .toLowerCase()===requested
    );

  if(!match){
    const list=
      available
        .map(c=>`〄 ${prefix}menu ${c}`)
        .join("\n");

    return m.reply(
      `❌ Kategori *${categoryInput}* tidak ditemukan.\n\nKategori tersedia:\n${list}`
    );
  }

  const meta=metaFor(match);
  const commands=
    commandsByCategory[match]||[];

  let text=
    `${meta.marker} *MENU - ${meta.label.toUpperCase()}*\n`+
    `┌────────────────\n`;

  for(const cmd of commands){
    if(cmd.isOwner&&!m.isOwner)continue;

    text+=
      `│ 〄 ${prefix}${cmd.name}`+
      (
        cmd.description?
        ` — ${cmd.description}`:
        ""
      )+
      "\n";
  }

  text+=
    `└────────────────\n\n`+
    `Total: ${commands.length} command`;

  return m.reply(text);
}

async function handler(
  m,
  {
    sock,
    config:botConfig
  }
){
  const prefix=
    getPrefix(m,botConfig);

  if(m.args&&m.args.length){
    return sendCategoryMenu(
      m,
      {config:botConfig},
      m.args.join(" ")
    );
  }

  const botName=
    botConfig?.bot?.name||
    botConfig?.botName||
    appConfig?.bot?.name||
    "Shinobu-Asistant";

  const developer=
    botConfig?.bot?.developer||
    botConfig?.developer||
    appConfig?.bot?.developer||
    "t.me/dekzyy";

  const version=
    botConfig?.bot?.version||
    botConfig?.version||
    appConfig?.bot?.version||
    "1.4";

  const mode=
    botConfig?.mode||
    botConfig?.botMode||
    appConfig?.mode||
    "public";

  const categories=
    sortedCategories();

  const commandsByCategory=
    getCommandsByCategory()||{};

  const totalCommands=
    totalCommandCount(
      commandsByCategory
    );

  const text=
    bodyText({
      botName,
      developer,
      version,
      mode,
      prefix,
      pushName:m.pushName,
      sender:m.sender,
      totalCommands
    });

  const imagePath=
    botConfig?.assets?.["menu-image"]||
    appConfig?.assets?.["menu-image"];

  const thumbPath=
    botConfig?.assets?.["menu-thumb"]||
    appConfig?.assets?.["menu-thumb"];

  try{
    await sendTagCard(
      sock,
      m,
      {
        botConfig,
        botName,
        text,
        prefix,
        categories,
        commandsByCategory,
        imagePath,
        thumbPath
      }
    );
  }catch(error){
    console.error(
      "[MENU ERROR]",
      error?.stack||error
    );

    await m.reply(text);
  }
}

export default{
  config,
  handler
};