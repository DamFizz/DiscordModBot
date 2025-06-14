const { Client, GatewayIntentBits, Partials, AuditLogEvent } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const BOT_TOKEN = 'YOUR_BOT_TOKEN'; // Ganti dengan token betul
const ADMIN_ROLE_IDS = ['1278924089893064755', '1278925944635002881', '1295387041433128981', '1337803246886060176', '1278921585939714058'];
const POPRAN_CHANNEL_ID = '1342733726966091797';
const AUDIT_LOG_CHANNEL_ID = '1299307486175559701';
const CLAIM_ROLE_CHANNEL_ID = '1278926913364164639';

const ROLE_REACTIONS = {
    '👦': '1295386888181649428', // boy
    '👧': '1295387149298040872', // gurl
    '🟢': '1278924030258319502'  // pichunkbuddy
};

const GENDER_ROLE_IDS = ['1295386888181649428', '1295387149298040872'];
const badWords = ["babi", "kote", "anjing", "sial", "puki", "buto", "fuck", "shit", "Anj", "anj", "nigger", "niga", "nigge", "nigga", "Kotey", "kotey"];

let claimMessageId = null;

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const claimChannel = await client.channels.fetch(CLAIM_ROLE_CHANNEL_ID);
    if (claimChannel) {
        const msg = await claimChannel.send(
            `Sila React Emoji Di Bawah Untuk Dapatkan Role Anda!!!!\n\n` +
            `👦 = Boy\n` +
            `👧 = Gurl\n` +
            `🟢 = PichunkBuddy`
        );
        claimMessageId = msg.id;

        for (const emoji of Object.keys(ROLE_REACTIONS)) {
            await msg.react(emoji);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id))) return;
    if (badWords.some(word => message.content.toLowerCase().includes(word))) {
        await message.delete();
        await message.channel.send(`⚠️ **${message.author.username}**, penggunaan bahasa kesat tidak dibenarkan.`);
    }
    if (message.content.toLowerCase() === '!ping') {
        const msg = await message.channel.send('Pinging...');
        msg.edit(`🏓 Pong! ${msg.createdTimestamp - message.createdTimestamp}ms`);
        message.channel.send('AKU TENGAH HIDUP LAGIIII');
    }
});

client.on('messageDelete', async (message) => {
    const auditChannel = client.channels.cache.get(AUDIT_LOG_CHANNEL_ID);
    if (!auditChannel || !message.guild) return;
    auditChannel.send(`🗑️ **${message.author.tag}** telah memadam mesej: "${message.content}" di **${message.channel.name}**.`);
});

client.on('guildAuditLogEntryCreate', async (entry, guild) => {
    const auditChannel = client.channels.cache.get(AUDIT_LOG_CHANNEL_ID);
    if (!auditChannel) return;

    if (entry.action === AuditLogEvent.MemberUpdate && entry.changes.some(change => change.key === 'communication_disabled_until')) {
        auditChannel.send(`⏳ **${entry.target.tag}** telah dikenakan timeout oleh **${entry.executor.tag}** dengan sebab: ${entry.reason || 'Tiada alasan diberikan.'}`);
    }
    if (entry.action === AuditLogEvent.MemberBanAdd) {
        auditChannel.send(`⛔ **${entry.target.tag}** telah di-ban oleh **${entry.executor.tag}** dengan sebab: ${entry.reason || 'Tiada alasan diberikan.'}`);
    }
    if (entry.action === AuditLogEvent.MemberKick) {
        auditChannel.send(`🚪 **${entry.target.tag}** telah dikick oleh **${entry.executor.tag}** dengan sebab: ${entry.reason || 'Tiada alasan diberikan.'}`);
    }
    if (entry.action === AuditLogEvent.ChannelCreate) {
        auditChannel.send(`📢 Channel **${entry.target.name}** telah dibuat oleh **${entry.executor.tag}**.`);
    }
    if (entry.action === AuditLogEvent.ChannelDelete) {
        auditChannel.send(`❌ Channel **${entry.target.name}** telah dipadam oleh **${entry.executor.tag}**.`);
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const auditChannel = client.channels.cache.get(AUDIT_LOG_CHANNEL_ID);
    if (!auditChannel) return;

    oldMember.roles.cache.forEach(role => {
        if (!newMember.roles.cache.has(role.id)) {
            auditChannel.send(`🔴 **${oldMember.user.tag}** telah hilang role **${role.name}**.`);
        }
    });
    newMember.roles.cache.forEach(role => {
        if (!oldMember.roles.cache.has(role.id)) {
            auditChannel.send(`🟢 **${newMember.user.tag}** telah mendapat role **${role.name}**.`);
        }
    });
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const auditChannel = client.channels.cache.get(AUDIT_LOG_CHANNEL_ID);
    if (!auditChannel) return;

    if (!oldState.channel && newState.channel) {
        auditChannel.send(`🔊 **${newState.member.user.tag}** telah menyertai voice channel **${newState.channel.name}**.`);
    } else if (oldState.channel && !newState.channel) {
        auditChannel.send(`🔇 **${oldState.member.user.tag}** telah meninggalkan voice channel **${oldState.channel.name}**.`);
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    if (user.bot) return;
    if (reaction.message.id !== claimMessageId) return;

    const roleId = ROLE_REACTIONS[reaction.emoji.name];
    if (!roleId) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    if (GENDER_ROLE_IDS.includes(roleId)) {
        const conflict = GENDER_ROLE_IDS.find(id => id !== roleId && member.roles.cache.has(id));
        if (conflict) {
            reaction.users.remove(user.id);
            return member.send('❌ Anda sudah mempunyai role bertentangan. Buang dulu untuk ambil yang lain.').catch(() => {});
        }
    }

    if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
        console.log(`✅ ${user.tag} diberi role ${roleId}`);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    if (user.bot) return;
    if (reaction.message.id !== claimMessageId) return;

    const roleId = ROLE_REACTIONS[reaction.emoji.name];
    if (!roleId) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        console.log(`❌ ${user.tag} role ${roleId} dibuang`);
    }
});

client.login(BOT_TOKEN);
