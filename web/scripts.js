console.log("welcome to s p a c e t u b e");

//need the environment variable at some point. this all seems like having a transpiled
//react app might be a lot better.

const homeServer = "spacetu.be";
//const url = `https://spacetube.${homeServer}`;
const url = `localhost:8134`;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const tubeCode = urlParams.get("tubeCode");

const start = async () => {
  if (!tubeCode) {
    return;
    //take to homepage and check localstorage for some optional spacetube codes?
  }

  //access user details from localstorage
  //  if none, register a user, invite to matrix room id and store in localstorage

  //send code and user details to spacetube api to get matrix room and tube room details
  //  this should be a direct matrix client server api request anyway
  //  actually maybe not for the tube room if we want that to be privileged
  //  otherwise we have to share the bot details

  const response = await fetch(`${url}/api/tubeinfo`, {
    method: "post",
    body: JSON.stringify({ tubeCode, userDetails }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  console.log(response); //response has matrix room id and a token to request tube room

  const getRooms = async () => {
    //matrix client server request for matrix room events
    //spacetube api request for tube room details, including userdetails and token
    //return rooms;
  };

  const renderRooms = (rooms) => {
    //display matrix room and tube room state/events
    //for each event in the matrix room result, create a div and put a p inside
    //make a button and add the sendEvent function to it.
    const sendEvent = (event) => {
      //send an event to the matrix room
    };
  };

  renderRooms(await getRooms());
};

start();
