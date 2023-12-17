console.log("welcome to s p a c e t u b e");

//need the environment variable at some point. this all seems like having a transpiled
//react app might be a lot better.

const homeServer = "spacetu.be";
const url = `https://spacetube.${homeServer}`;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const linkToken = urlParams.get("linkToken");

const start = async () => {
  if (!linkToken) {
    return;
    //??take to homepage and check localstorage for some optional spacetube codes?
  }

  let user;
  const storedUser = localStorage.getItem("spacetube-user");
  if (!storedUser) {
    const userName = "jeff";
    const response = await fetch(`${url}/api/register`, {
      method: "post",
      body: JSON.stringify({ linkToken, userName }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const registration = await response.json();

    if (registration.success) {
      user = {
        name: userName,
        userId: registration.user_id,
        accessToken: registration.access_token,
      };

      localStorage.setItem("spacetube-user", JSON.stringify(user));
    } else {
      console.log("registration failed");
      return;
    }
  } else {
    user = JSON.parse(storedUser);
  }

  console.log(user);

  const response = await fetch(`${url}/api/tubeInfo?linkToken=${linkToken}`);
  const tubeInfo = await response.json();

  const getRooms = async () => {
    const response = await fetch(
      `https://matrix.${homeServer}/_matrix/client/v3/rooms/${tubeInfo.matrixRoomId}/messages?limit=1000`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.accessToken}`,
        },
      }
    );
    const eventsList = await response.json();

    return {
      matrixRoom: eventsList.chunk,
      tubeRoom: tubeInfo.tubeRoomEvents,
    };
  };

  const renderRooms = (rooms) => {
    const matrixRoomContainer = document.getElementById(
      "matrix-room-events-container"
    );

    rooms.matrixRoom.forEach((event) => {
      if (event.type === "m.room.message") {
        const messageElement = document.createElement("p");
        messageElement.innerHTML = `${event.sender}: ${event.content.body}`;
        matrixRoomContainer.append(messageElement);
      }
    });

    const tubeRoomContainer = document.getElementById(
      "tube-room-events-container"
    );

    rooms.tubeRoom.forEach((event) => {
      if (event.type === "m.room.message") {
        const messageElement = document.createElement("p");
        messageElement.innerHTML = `${event.sender}: ${event.content.body}`;
        tubeRoomContainer.append(messageElement);
      }
    });

    const button = document.getElementById("send-button");
    button.disabled = false;

    const input = document.getElementById("new-message-text");
    input.onchange = (event) => {
      const message = event.target.value;
      console.log(message);

      button.onclick = () => sendEvent(message);
    };

    const sendEvent = async (message) => {
      fetch(
        `https://matrix.${homeServer}/_matrix/client/v3/rooms/${tubeInfo.matrixRoomId}/send/m.room.message`,
        {
          method: "POST",
          body: JSON.stringify({
            body: message,
            msgtype: "m.text",
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );
    };
  };

  renderRooms(await getRooms());
};

start();
