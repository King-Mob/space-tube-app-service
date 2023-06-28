import 'dotenv/config';
import { AppService, AppserviceHttpError } from "matrix-appservice";
// listening
const as = new AppService({
    homeserverToken: process.env.HOME_SERVER_TOKEN
});
as.on("type:m.room.message", (event) => {
    // handle the incoming message
    console.log(event);
});
as.onUserQuery = function (userId, callback) {
    // handle the incoming user query then respond
    console.log("RECV %s", userId);

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
as.listen(8010);