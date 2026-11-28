<div align="center">
 <p>
  <a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
 </p>
</div>

## About

`@shyzg/discord.js-selfbot` is a user-account (selfbot) fork of [discord.js] v14 for [Node.js](https://nodejs.org). It works with **user tokens only**, not bot tokens.

> ⚠️ **Automating a user account violates [Discord's Terms of Service](https://discord.com/terms) and can get the account permanently banned.** Use at your own risk.

- Familiar discord.js v14 API (`new Client()` requires no `intents`)
- User-account authentication: raw token, email/password (TOTP/SMS/backup MFA + captcha hook), QR remote-auth, and WebAuthn passkeys
- Discord web-client REST/gateway fingerprint with per-client session UUIDs
- Op-37 guild member list fetching and large-guild subscriptions, and group DM messaging
- Friends and friend requests, friend presences, joining through invites, private notes, read state, and your real status across sessions
- Synced account settings: status and custom status on every device
- DM and group DM calls: who is in them, who is being rung, ringing and declining
- Other bots' slash commands, buttons, select menus and modals

## Installation

**Node.js 24.22.3 or newer is required.**

```sh
npm install @shyzg/discord.js-selfbot
yarn add @shyzg/discord.js-selfbot
pnpm add @shyzg/discord.js-selfbot
bun add @shyzg/discord.js-selfbot
```

## Usage

```js
import { Client, Events } from '@shyzg/discord.js-selfbot';

const client = new Client();

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, message => {
  if (message.content === '!ping') {
    message.channel.send('Pong!');
  }
});

// Reads process.env.DISCORD_TOKEN when called without an argument
await client.login(process.env.DISCORD_TOKEN);
```

### Other login methods

```js
// Email/phone + password (totpSecret auto-generates TOTP codes; captcha/mfa hooks are optional)
await client.normalLogin('user@example.com', 'password', {
  totpSecret: 'JBSWY3DP...',
  // captcha: async challenge => solvedCaptchaKey,
  // mfa: async ({ sendSms }) => ({ method: 'totp', code: '123456' }),
});

// QR code remote-auth (renders an ASCII QR code in the terminal if onQRCode is omitted)
await client.QRLogin({
  onQRCode: url => console.log('Scan with Discord mobile:', url),
  onUserData: user => console.log('Scanned by:', user.username),
});

// Exported WebAuthn passkey (e.g. Bitwarden fido2Credentials)
await client.passkeyLogin({
  credentialId: passkey.credentialId,
  privateKey: passkey.keyValue,
  userHandle: passkey.userHandle,
});
```

### Fetching guild members

User accounts cannot use op-8 `guild.members.fetch()` freely on large guilds. Use `fetchMemberList` (op 37) with a channel visible to the guild:

```js
const members = await guild.members.fetchMemberList(channel, { limit: 200 });
```

### Receiving events from large guilds

Discord sends a user account no messages, typing, thread or member updates from a guild with more than 250 members until the account subscribes to it, as the app does when you open the server. Subscriptions last for the gateway session and are sent again after a re-identify:

```js
client.once(Events.ClientReady, async () => {
  await client.guilds.subscribe(client.guilds.cache); // or guild.subscribe()
});
```

### Friends, notes, invites and read state

```js
// Friends, blocked users and pending requests (also kept current by relationshipAdd/Update/Remove)
console.log(client.relationships.friends.size, client.relationships.incoming.size);
await client.relationships.sendFriendRequest('username');
await client.relationships.addFriend(user); // send a request, or accept theirs
await client.relationships.remove(user); // unfriend, cancel, decline or unblock
await client.relationships.block(user);

// Friend and DM-recipient presences outside guilds (cached in client.presences)
client.on(Events.UserPresenceUpdate, (oldPresence, newPresence) => {
  console.log(`${newPresence.userId} is now ${newPresence.status}`);
});

// Private notes about users
await user.setNote('met at the meetup');
console.log(await user.fetchNote());

// Join a guild or group DM (pass { captcha } to solve a challenge)
const guild = await client.acceptInvite('https://discord.gg/code');

// Read state
await channel.markRead();
await message.markRead();

// The status other users see, across all your sessions (client.presence is what this client asks for)
console.log(client.user.status, client.user.sessions.size);
```

### Status and custom status (synced settings)

`client.user.settings` reads and writes the account's synced settings, so a change shows on every device, like changing it in the app. Every other setting is kept exactly as Discord sent it. Discord rate limits these updates heavily: change several values with one `edit()`.

```js
console.log(client.user.settings.status, client.user.settings.customStatus);

await client.user.settings.edit({
  status: 'dnd',
  customStatus: { text: 'Focusing', emoji: '🔕', expiresAt: Date.now() + 60 * 60_000 },
});
await client.user.settings.setCustomStatus(null); // clear it

client.on(Events.UserSettingsUpdate, (oldSettings, newSettings) => {
  if (oldSettings.status !== newSettings.status) console.log(`status: ${newSettings.status}`);
});
```

### DM and group DM calls

`client.calls` tracks the calls in your DMs and group DMs: who is in them and who is being rung. `ring()`, `stopRinging()` and `setRegion()` only work while a call is active. Joining a call's voice is not supported: there is no voice adapter for DMs. Voice channels in guilds do work (see below).

```js
client.on(Events.CallCreate, call => console.log(`call in ${call.channelId}, ringing ${call.ringing.length}`));

client.on(Events.CallVoiceStateUpdate, (oldState, newState, call) => {
  if (!oldState) console.log(`${newState.userId} joined the call in ${call.channelId}`);
  else if (!newState.channelId) console.log(`${newState.userId} left`);
});

await dmChannel.call?.ring(); // ring everyone again
await dmChannel.call?.stopRinging(); // decline an incoming call
```

### Voice channels

Voice in guild voice channels goes through [`@discordjs/voice`](https://www.npmjs.com/package/@discordjs/voice) with `guild.voiceAdapterCreator`, as in discord.js.

Discord only accepts end-to-end encrypted voice (DAVE), and closes any other voice connection with code 4017. Use `@discordjs/voice` 0.19.1 or newer, which installs the DAVE library `@snazzah/davey` for you:

- **0.19.0:** works only after you install `@snazzah/davey` yourself.
- **Earlier versions:** cannot connect.

```js
import { entersState, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';

const connection = joinVoiceChannel({
  channelId: channel.id,
  guildId: channel.guild.id,
  adapterCreator: channel.guild.voiceAdapterCreator,
});
await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
```

Running several accounts in one process? Give each account its own `group` in `joinVoiceChannel`. Otherwise it returns the connection of the account that joined that guild first.

### Other bots' slash commands, buttons and select menus

Each call resolves with the bot's answer, matched to your interaction:

- its reply;
- for buttons and menus, the message after the bot edited it;
- a `Modal` to fill in;
- or `null` if none of these came in time.

A deferred reply ("is thinking...") resolves once the bot fills it in, waiting up to a minute. Attachment options are not supported.

```js
import { Modal } from '@shyzg/discord.js-selfbot';

// Options go in the command's order, or in one object by name; subcommands go in the name
const reply = await channel.sendSlash(botId, 'help');
await channel.sendSlash(botId, 'settings prefix set', '!');

// Buttons and select menus on a bot's message, by custom id
const answer = await message.clickButton('confirm');
await message.selectMenu('color', ['red']);

if (answer instanceof Modal) await answer.submit({ feedback: 'Great bot!' });
```

### Limiting memory on long-running accounts

By default every channel keeps its last 200 messages in memory for as long as the client runs. To drop older ones, add a message sweeper (the default thread sweeper is kept). `messageDelete`, `messageUpdate`, and reaction events for a swept message only fire if you enable `Partials.Message`:

```js
const client = new Client({
  // Every hour, drop cached messages older than 30 minutes
  sweepers: { messages: { interval: 3_600, lifetime: 1_800 } },
});
```

## Differences from discord.js

- **User accounts only:** `intents` are optional and ignored; `client.application` is `null` for user sessions.
- **No user embeds or components:** Sending embeds or components rejects with `MessageEmbedsUserAccount` / `MessageComponentsUserAccount` (webhooks can still send them).
- **Status is left alone:** `client.presence.status` starts as `unknown`, so Discord keeps the status set in your other apps; `setActivity()` and `setAFK()` no longer switch you to online. Call `setStatus()` to pick one; `client.user.status` shows the status Discord settled on.
- **Presences without a guild:** the overall presence of friends and DM recipients arrives as `userPresenceUpdate` (with `newPresence.guild === null`) and is cached in `client.presences`; `presenceUpdate` stays guild-only, so handlers ported from bots keep working. A friend in shared guilds also produces one `presenceUpdate` per guild.
- **Call voice states:** voice states in DM and group DM calls have no guild, so they arrive as `callVoiceStateUpdate` and live in `call.voiceStates`; `voiceStateUpdate` stays guild-only.
- **Group DMs:** `PartialGroupDMChannel` supports `send`, `sendTyping`, `fetch`, `delete`, `createMessageCollector`, and `awaitMessages`.
- **Bot-only APIs removed:** Sharding (`ShardingManager`), receiving interactions with their modals and component collectors (sending interactions to other bots as the user is supported, see above), application commands/emojis/entitlements/SKUs/subscriptions, `Client#generateInvite`, `bulkDelete`/`bulkDeletable`, `fetchActiveThreads`/`fetchActive`, `ThreadMemberManager#fetch`/`fetchMe`, `ThreadChannel#fetchOwner`, `VoiceStateManager#fetch`/`VoiceState#fetch`, and `members.list`/`members.search`.

## Development

```sh
pnpm install
pnpm test    # node --test + tsc + tsd
pnpm lint    # biome check
pnpm format  # biome check --write
```

## Contributing

Before creating an issue, please ensure that it hasn't already been reported/suggested, and double-check the
[documentation][documentation].

## Credits

- [discord.js]
- [discord.js-selfbot-v13]

## Help

If you don't understand something in the documentation, you are experiencing problems, or you just need a gentle nudge in the right direction, please don't hesitate to join our official [Shyzago Server][discord].

[documentation]: https://discord-js-selfbot.shyzago.dev
[discord]: https://discord.gg/shyzago
[discord.js]: https://github.com/discordjs/discord.js
[discord.js-selfbot-v13]: https://github.com/aiko-chan-ai/discord.js-selfbot-v13
