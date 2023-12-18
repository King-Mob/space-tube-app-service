console.log("welcome to 🛸s p a c e t u b e🛸");

const url = `https://spacetube.${homeServer}`;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const linkToken = urlParams.get("linkToken");
const displayName = urlParams.get("name");

const start = async () => {
  if (!linkToken) {
    return;
    //??take to homepage and check localstorage for some optional spacetube codes?
  }

  let user;
  const storedUser = localStorage.getItem(`spacetube-user-${linkToken}`);
  if (!storedUser) {
    const userName = displayName;

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

      localStorage.setItem(`spacetube-user-${linkToken}`, JSON.stringify(user));
    } else {
      console.log("registration failed");
      return;
    }
  } else {
    user = JSON.parse(storedUser);
  }

  console.log(user);

  const getRooms = async () => {
    const tubeInfoResponse = await fetch(`${url}/api/tubeInfo?linkToken=${linkToken}`);
    const tubeInfo = await tubeInfoResponse.json();

    const matrixRoomResponse = await fetch(
      `https://matrix.${homeServer}/_matrix/client/v3/rooms/${tubeInfo.matrixRoomId}/messages?limit=1000`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.accessToken}`,
        },
      }
    );
    const eventsList = await matrixRoomResponse.json();

    return {
      matrixRoomId: tubeInfo.matrixRoomId,
      matrixRoom: eventsList.chunk,
      tubeRoom: {
        name: tubeInfo.tubeRoomName,
        events: tubeInfo.tubeRoomEvents
      }
    };
  };

  const renderRooms = (rooms) => {
    const matrixRoomContainer = document.getElementById(
      "matrix-room-events-container"
    );
    matrixRoomContainer.replaceChildren();

    rooms.matrixRoom.names = {};

    console.log(rooms.matrixRoom)

    rooms.matrixRoom.forEach((event) => {
      if (event.type === "m.room.name") {
        const roomTitle = document.getElementById("matrix-room-title");
        roomTitle.innerHTML = "🏠" + event.content.name;
      }
      if (event.type === "m.room.message") {
        const messageContainerElement = document.createElement("div");
        messageContainerElement.id = event.event_id;
        messageContainerElement.classList.add("message-container");
        const nameElement = document.createElement("p");
        nameElement.innerHTML = rooms.matrixRoom.names[event.sender] || event.sender;
        nameElement.classList.add("name");
        messageContainerElement.append(nameElement);
        const messageElement = document.createElement("p");
        messageElement.innerHTML = event.content.body;
        messageContainerElement.append(messageElement);
        messageContainerElement.onclick = () => {
          if (confirm("Send this message to the tube?")) {
            const txnId = self.crypto.randomUUID();

            fetch(`https://matrix.${homeServer}/_matrix/client/v3/rooms/${rooms.matrixRoomId}/send/spacetube.egress/${txnId}?user_id=@${user.userId}`, {
              method: "PUT",
              body: JSON.stringify({
                type: "spacetube.egress",
                body: event.content.body,
                originalEventId: event.event_id
              }),
              headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${user.accessToken}`
              }
            });
          }
          setTimeout(() => getRooms().then(rooms => renderRooms(rooms)), 3500);
        }
        matrixRoomContainer.append(messageContainerElement);
      }
      if (event.type === "spacetube.egress" && event.content.originalEventId) {
        const forwarded = document.createElement("p");
        forwarded.innerHTML = `forwarded to tube by ${rooms.matrixRoom.names[event.sender] || event.sender}`;
        forwarded.classList.add("forwarded");
        const originalMessageContainer = document.getElementById(event.content.originalEventId);
        originalMessageContainer.append(forwarded);
      }
      if (event.type === "m.room.member" && event.content.displayname && event.content.membership === "join") {
        rooms.matrixRoom.names[event.sender] = event.content.displayname;
      }
    });

    matrixRoomContainer.scrollTo(0, matrixRoomContainer.scrollHeight);

    const tubeRoomContainer = document.getElementById(
      "tube-room-events-container"
    );

    tubeRoomContainer.replaceChildren();

    rooms.tubeRoom.names = {};

    rooms.tubeRoom.events.forEach((event) => {
      if (event.type === "m.room.name") {
        const roomTitle = document.getElementById("tube-room-title");
        roomTitle.innerHTML = event.content.name;
      }
      if (event.type === "m.room.message") {
        const messageContainerElement = document.createElement("div");
        messageContainerElement.classList.add("message-container");
        const nameElement = document.createElement("p");
        nameElement.innerHTML = rooms.tubeRoom.names[event.sender] || event.sender;
        nameElement.classList.add("name");
        messageContainerElement.append(nameElement);
        const messageElement = document.createElement("p");
        messageElement.innerHTML = event.content.body;
        messageContainerElement.append(messageElement);
        tubeRoomContainer.append(messageContainerElement);
      }
      if (event.type === "m.room.member" && event.content.displayname) {
        rooms.tubeRoom.names[event.sender] = event.content.displayname;
      }
    });

    const roomTitle = document.getElementById("tube-room-title");
    const tubeRoomTitle = `🛸🛸${rooms.tubeRoom.names[Object.keys(rooms.tubeRoom.names)[2]]} + ${rooms.tubeRoom.names[Object.keys(rooms.tubeRoom.names)[3]]}🛸🛸`;
    roomTitle.innerHTML = tubeRoomTitle;

    tubeRoomContainer.scrollTo(0, tubeRoomContainer.scrollHeight);

    const button = document.getElementById("send-button");
    button.disabled = false;

    const input = document.getElementById("new-message-text");
    input.onkeyup = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        button.click();
      }
    }
    input.onchange = (event) => {
      const message = event.target.value;

      button.onclick = async () => {
        sendEvent(message);
        input.value = "";
        setTimeout(() => getRooms().then(rooms => renderRooms(rooms)), 100);
      }
    };

    const sendEvent = async (message) => {
      fetch(
        `https://matrix.${homeServer}/_matrix/client/v3/rooms/${rooms.matrixRoomId}/send/m.room.message`,
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

  setInterval(() => getRooms().then(rooms => renderRooms(rooms)), 1000);
};

start();
