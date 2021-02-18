const Discord = require('discord.js');
const AutoPoster = require('topgg-autoposter');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const {default_guild_doc} = require('./modules/essentials.js');

// FIXME: Create a file named './tokens.json' and fill it. See README.md.
const tokensObject = require('./tokens.json');
const clientToken = tokensObject.clientToken;
const topggToken = tokensObject.topggToken;
const firebaseCredentials = tokensObject.firebaseCredentials;

const client = new Discord.Client();
const ap = AutoPoster(topggToken, client);

admin.initializeApp({
  credential: admin.credential.cert(firebaseCredentials)
});
const db = admin.firestore();

const act_types = ['LISTENING', 'WATCHING', 'PLAYING', 'STREAMING', 'COMPETING'];
const setActivity = () => {
    let type = act_types[Math.floor(Math.random() * act_types.length)];
    // Masterpiece by Snazz on YouTube.
    client.user.setActivity(`世界 ＊ &help`, {type: type, url: 'https://youtu.be/K0MDWjelrgY'})
      .catch(console.error);
}

let commandModules = [];

client.on('ready', () => {
  setActivity();
  setInterval(setActivity, 600e3);

  let commandsPath = path.join(`${__dirname}/commands`);
  fs.readdirSync(commandsPath).forEach(file => commandModules.push(require(`${commandsPath}/${file}`)));
});

client.on('guildCreate', guild => db.collection('guilds').doc(guild.id).set(default_guild_doc)
  .catch(console.error));

client.on('message', async message => {
  if (message.author.bot) return;

  let prefix = '&';
  if (message.guild) prefix = await (() => new Promise(async (resolve, reject) => {
    let documentSnapshot = await db.collection('guilds').doc(message.guild.id).get();
    if (!documentSnapshot.exists) db.collection('guilds').doc(message.guild.id).set(default_guild_doc)
      .catch(reject);
    else resolve(documentSnapshot.data().prefix);
  }))()
    .catch(console.error);
  if (!message.content.startsWith(prefix)) return;

  let command = message.content.replace(prefix, '').split(/ +/g)[0].toLowerCase();
  let args = message.content.split(/ +/g);
  args.splice(args.indexOf(`${prefix}${command}`, 1));

  for (const i of commandModules) if (i[command]) {
    message.channel.startTyping();
    i[command](message, client, args, db);
    break;
  }
});

client.on('invalidated', () => process.kill(process.pid, 'SIGTERM'));
client.login(clientToken);
