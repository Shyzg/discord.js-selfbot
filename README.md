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
- **Group DMs:** `PartialGroupDMChannel` supports `send`, `sendTyping`, `fetch`, `delete`, `createMessageCollector`, and `awaitMessages`.
- **Bot-only APIs removed:** Sharding (`ShardingManager`), interactions/modals/component collectors, application commands/emojis/entitlements/SKUs/subscriptions, `Client#generateInvite`, `bulkDelete`/`bulkDeletable`, `fetchActiveThreads`/`fetchActive`, `ThreadMemberManager#fetch`/`fetchMe`, `ThreadChannel#fetchOwner`, `VoiceStateManager#fetch`/`VoiceState#fetch`, and `members.list`/`members.search`.

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
