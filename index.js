import 'dotenv/config';
import { AppService, AppserviceHttpError } from "matrix-appservice";
import { handleMessage, handleInvite, handleRemoteOpen } from './handler.js';
import { startDiscord } from './discord/index.js';

// listening
const as = new AppService({
  homeserverToken: process.env.HOME_SERVER_TOKEN
});

as.on("http-log", (event) => {
  console.log("http-log", event);
});

as.on("event", event => {
  console.log("event received", event)

  switch (event.type) {
    case "m.room.message":
      handleMessage(event);
      break;
    case "m.room.member":
      handleInvite(event);
      break;
    case "spacetube.remote.open":
      handleRemoteOpen(event)
    default:
      break;
  }
})

as.on("ephemeral", event => {
  console.log(event);
})

as.onUserQuery = function (userId, callback) {
  // handle the incoming user query then respond
  console.log("RECV %s", userId);

  console.log("is this the invite function???")
  console.log(callback)

  /*
  // if this userId cannot be created, or if some error
  // conditions occur, throw AppserviceHttpError exception.
  // The underlying appservice code will send the HTTP status,
  // Matrix errorcode and error message back as a response.
 
  if (userCreationOrQueryFailed) {
    throw new AppserviceHttpError(
      {
        errcode: "M_FORBIDDEN",
        error: "User query or creation failed.",
      },
      403, // Forbidden, or an appropriate HTTP status
    )
  }
  */

  callback();
};
// can also do this as a promise
as.onAliasQuery = async function (alias) {
  console.log("RECV %s", alias);
};

//handle ping
const asApp = as.expressApp;
asApp.post('/_matrix/app/v1/ping', (req, res) => {
  console.log(req);
  res.send({ message: "yo how's it going on 8133!" });
})

as.listen(8133);

//starts discord service on port 8134
if (process.env.DISCORD_TOKEN) {
  startDiscord();
}
