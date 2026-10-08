import appConfig from '../../config.js'
import { isLid, lidToJid, addRole, removeRole, listByRole, getUserRole, VALID_SERVERS, getText } from '../../src/lib/panelCompat.js'

const config = {
    name: 'addseller',
    alias: ['addreseller', 'delseller', 'delreseller', 'listseller', 'listreseller'],
    category: 'panel',
    description: 'Kelola seller/reseller panel',
    usage: '.addseller @user atau .delseller @user',
    example: '.addseller @user',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function cleanJid(jid) {
    if (!jid) return null
    if (isLid(jid)) jid = lidToJid(jid)
    return jid.includes('@') ? jid : jid + '@s.whatsapp.net'
}

function getNumber(jid) {
    const clean = cleanJid(jid)
    return clean ? clean.split('@')[0] : null
}

function hasAccess(senderJid, isOwner) {
    if (isOwner) return true
    const number = getNumber(senderJid)
    if (!number) return false
    const ownerPanels = appConfig.pterodactyl?.ownerPanels || []
    return ownerPanels.map(String).includes(number)
}

function migrateLegacySellers() {
    const legacy = appConfig.pterodactyl?.sellers || []
    if (!Array.isArray(legacy) || !legacy.length) return

    for (const seller of legacy) {
        const number = String(seller).replace(/\D/g, '')
        if (!number) continue

        for (const server of VALID_SERVERS) {
            if (getUserRole(number, server) !== 'reseller') {
                addRole(number, server, 'reseller')
            }
        }
    }
}

function getAllSellers() {
    const users = new Set()
    for (const server of VALID_SERVERS) {
        for (const number of listByRole(server, 'reseller')) {
            users.add(String(number))
        }
    }
    return [...users]
}

function handler(m, ctx = {}) {
    const inputText = getText(m, ctx)
    const command = String(ctx.command || '').toLowerCase()
    const cmd = command || String(ctx.cmd || '').toLowerCase()

    migrateLegacySellers()

    if (!hasAccess(m.sender, m.isOwner)) {
        return m.reply(`❌ *ᴀᴋsᴇs ᴅɪᴛᴏʟᴀᴋ*\n\n> Fitur ini hanya untuk Owner atau Owner Panel.`)
    }

    const isAdd = ['addseller', 'addreseller'].includes(cmd)
    const isDel = ['delseller', 'delreseller'].includes(cmd)
    const isList = ['listseller', 'listreseller'].includes(cmd)

    if (isList) {
        const sellers = getAllSellers()
        if (!sellers.length) {
            return m.reply(`📋 *ᴅᴀꜰᴛᴀʀ sᴇʟʟᴇʀ/ʀᴇsᴇʟʟᴇʀ*\n\n> Belum ada seller terdaftar.`)
        }

        let txt = `📋 *ᴅᴀꜰᴛᴀʀ sᴇʟʟᴇʀ/ʀᴇsᴇʟʟᴇʀ*\n\n`
        txt += `> Total: *${sellers.length}* seller\n\n`
        sellers.forEach((number, index) => {
            const servers = VALID_SERVERS.filter(server => getUserRole(number, server) === 'reseller')
            txt += `${index + 1}. \`${number}\` — ${servers.map(v => v.toUpperCase()).join(', ')}\n`
        })
        txt += `\n> Seller bisa create server sesuai akses servernya.`
        return m.reply(txt)
    }

    if (!isAdd && !isDel) return m.reply(`❌ Command tidak valid.`)

    let targetUser = null
    if (m.quoted?.sender) {
        targetUser = getNumber(m.quoted.sender)
    } else if (m.mentionedJid?.length) {
        targetUser = getNumber(m.mentionedJid[0])
    } else if (inputText) {
        targetUser = inputText.trim().replace(/[^0-9]/g, '')
    }

    if (!targetUser) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}${cmd} @user\`\n` +
            `> \`${m.prefix}${cmd} 628xxx\`\n` +
            `> Reply pesan user`
        )
    }

    if (isAdd) {
        const currentServers = VALID_SERVERS.filter(server => getUserRole(targetUser, server) === 'reseller')
        if (currentServers.length === VALID_SERVERS.length) {
            return m.reply(`❌ \`${targetUser}\` sudah menjadi seller.`)
        }

        for (const server of VALID_SERVERS) {
            addRole(targetUser, server, 'reseller')
        }

        m.react('✅')
        return m.reply(
            `✅ *sᴇʟʟᴇʀ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ*\n\n` +
            `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
            `┃ 📱 ɴᴏᴍᴏʀ: \`${targetUser}\`\n` +
            `┃ 🏷️ sᴛᴀᴛᴜs: \`Seller/Reseller\`\n` +
            `┃ 🖥️ sᴇʀᴠᴇʀ: \`${VALID_SERVERS.map(v => v.toUpperCase()).join(', ')}\`\n` +
            `┃ 🔓 ᴀᴋsᴇs: \`Create Server sesuai server\`\n` +
            `╰┈┈⬡`
        )
    }

    const currentServers = VALID_SERVERS.filter(server => getUserRole(targetUser, server) === 'reseller')
    if (!currentServers.length) {
        return m.reply(`❌ \`${targetUser}\` bukan seller.`)
    }

    for (const server of VALID_SERVERS) {
        if (getUserRole(targetUser, server) === 'reseller') {
            removeRole(targetUser, server, 'reseller')
        }
    }

    m.react('✅')
    return m.reply(
        `✅ *sᴇʟʟᴇʀ ᴅɪʜᴀᴘᴜs*\n\n` +
        `> Nomor: \`${targetUser}\`\n` +
        `> Akses reseller di semua server telah dihapus.`
    )
}

export default { config, handler }
