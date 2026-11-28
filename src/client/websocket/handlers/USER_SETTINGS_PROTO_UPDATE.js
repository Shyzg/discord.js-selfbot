'use strict';

// Type 1 is PreloadedUserSettings, the proto READY sends; other types (frecency, ...) are not cached.
module.exports = (client, { d: data }) => {
  if (!client.user || data.settings?.type !== 1) return;
  client.user.settings._apply(data.settings.proto, data.partial);
};
