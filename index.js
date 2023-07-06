import 'dotenv/config';
import { AppService, AppserviceHttpError } from "matrix-appservice";
import fetch from 'node-fetch';
// listening
const as = new AppService({
  homeserverToken: process.env.HOME_SERVER_TOKEN
});

as.on("http-log", (event) => {
  console.log(event);
  console.log("something happened");
});

as.on("type:m.room.message", (event) => {
  // handle the incoming message
  console.log(event);
});


as.on("event", event => {
  console.log("hello")
  if (event.type === "m.room.message")
    if (event.content.body.includes("!space-tube")) {
      console.log(event);
      const message = "you said: " + event.content.body.split("!space-tube ")[1];

      fetch("https://matrix.wobbly.app/_matrix/client/v3/rooms/!LuxYhffhkmWXJLuwJV:wobbly.app/send/m.room.message?user_id=@example-appservice:wobbly.app", {
        method: 'POST',
        body: JSON.stringify({
          body: message,
          msgtype: "m.text"
        }),
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${process.env.APPLICATION_TOKEN}`
        }
      })

    }
})

as.onUserQuery = function (userId, callback) {
  // handle the incoming user query then respond
  console.log("RECV %s", userId);

  console.log("is this the invite function???")

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
as.listen(8133);
