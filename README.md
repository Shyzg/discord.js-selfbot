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
- Op-14 guild member list fetching and group DM messaging

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

User accounts cannot use op-8 `guild.members.fetch()` freely on large guilds. Use `fetchMemberList` (op 14) with a channel visible to the guild:

```js
const members = await guild.members.fetchMemberList(channel, { limit: 200 });
```

## Differences from discord.js

- **User accounts only:** `intents` are optional and ignored; `client.application` is `null` for user sessions.
- **No user embeds:** Sending embeds rejects with `MessageEmbedsUserAccount` (webhooks can still send embeds).
- **Group DMs:** `PartialGroupDMChannel` supports `send`, `sendTyping`, `fetch`, `delete`, `createMessageCollector`, and `awaitMessages`.
- **Bot-only APIs removed:** Sharding (`ShardingManager`), interactions/modals/component collectors, application commands/emojis/entitlements/SKUs/subscriptions, `Client#generateInvite`, `fetchActiveThreads`/`fetchActive`, and `members.list`/`members.search`.

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
