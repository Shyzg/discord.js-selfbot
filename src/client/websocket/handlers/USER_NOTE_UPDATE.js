'use strict';

module.exports = (client, { d: data }) => {
  client.users._patchNote(data.id, data.note);
};
