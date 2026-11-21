# @shyzg/discord.js-selfbot

A fork of [discord.js](https://github.com/discordjs/discord.js), based on `14.28.1`.

> **Status — not a working selfbot yet.** The source currently mirrors upstream
> discord.js almost verbatim. The only change from upstream is in
> `WebSocketManager`: it drops the internal gateway manager on `destroy()` so the
> account token isn't kept in memory afterwards.
>
> Logging in with a **user token** will fail as-is, because requests still use the
> `Bot ` authorization scheme and the bot-only gateway endpoint. The user-account
> auth layer (raw token, `x-super-properties`, client fingerprint) is not
> implemented.

> ⚠️ **Automating a user account violates [Discord's Terms of Service](https://discord.com/terms)
> and can get the account permanently banned.** Use at your own risk.

## Install

```sh
pnpm add @shyzg/discord.js-selfbot
```

## Usage

The public API matches discord.js 14.x — see the
[discord.js guide](https://discordjs.guide) and [docs](https://discord.js.org).

## Development

```sh
pnpm install
pnpm test     # node --test + tsc + tsd
pnpm lint     # biome
```

## License

[Apache-2.0](./LICENSE)
