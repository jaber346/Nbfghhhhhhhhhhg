// commands/take.js
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const config = require("../config");

// Preview chaîne (sans lien visible)
function newsletterCtx() {
  return {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363423249667073@newsletter",
      newsletterName: config.BOT_NAME || "NOVA XMD V1",
      serverMessageId: 1
    }
  };
}

function getQuotedMessage(m) {
  return (
    m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    m.message?.imageMessage?.contextInfo?.quotedMessage ||
    m.message?.videoMessage?.contextInfo?.quotedMessage ||
    m.message?.documentMessage?.contextInfo?.quotedMessage ||
    null
  );
}

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

module.exports = {
  name: "take",
  category: "Tools",
  description: "Reprendre un sticker et changer Pack/Author (répondre au sticker)",

  async execute(sock, m, args, { prefix } = {}) {
    const from = m.key.remoteJid;

    const quoted = getQuotedMessage(m);
    if (!quoted || !quoted.stickerMessage) {
      return sock.sendMessage(
        from,
        {
          text:
`⚠️ Réponds à un *sticker* avec cette commande.

Ex:
${prefix || "."}take
${prefix || "."}take NOVA XMD V1 | DEV NOVA`
        },
        { quoted: m }
      );
    }

    // pack|author
    const raw = (args || []).join(" ").trim();
    const [pack, author] = raw.includes("|")
      ? raw.split("|").map(s => s.trim()).slice(0, 2)
      : [raw, ""];

    const packname = pack || (config.BOT_NAME || "NOVA XMD V1");
    const authorname = author || (config.OWNER_NAME || "DEV NOVA");

    try {
      // download original sticker (webp)
      const stream = await downloadContentFromMessage(quoted.stickerMessage, "sticker");
      const stickerBuf = await streamToBuffer(stream);

      // try wa-sticker-formatter (best)
      let Sticker, StickerTypes;
      try {
        ({ Sticker, StickerTypes } = require("wa-sticker-formatter"));
      } catch {
        Sticker = null;
      }

      if (Sticker) {
        const st = new Sticker(stickerBuf, {
          pack: packname,
          author: authorname,
          type: StickerTypes.FULL,
          quality: 60
        });

        const out = await st.toBuffer();

        return sock.sendMessage(
          from,
          {
            sticker: out,
            contextInfo: newsletterCtx()
          },
          { quoted: m }
        );
      }

      // fallback (renvoie le sticker sans changer metadata)
      await sock.sendMessage(
        from,
        {
          sticker: stickerBuf,
          contextInfo: newsletterCtx()
        },
        { quoted: m }
      );

      return sock.sendMessage(
        from,
        {
          text:
`✅ Sticker repris.

⚠️ Pour changer Pack/Author, installe :
npm i wa-sticker-formatter`,
          contextInfo: newsletterCtx()
        },
        { quoted: m }
      );

    } catch (e) {
      return sock.sendMessage(
        from,
        { text: "❌ Impossible de récupérer ce sticker.", contextInfo: newsletterCtx() },
        { quoted: m }
      );
    }
  }
};
