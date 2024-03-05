import "../styles/app.css";
import { useState, useEffect } from "react";

const { HOME_SERVER } = process.env;
const url = `https://spacetube.${HOME_SERVER}`;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const linkToken = urlParams.get("linkToken");
const displayName = urlParams.get("name");

const getRooms = async (user) => {
  const tubeInfoResponse = await fetch(
    `${url}/api/tubeInfo?linkToken=${linkToken}`
  );
  const tubeInfo = await tubeInfoResponse.json();

  const matrixRoomResponse = await fetch(
    `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${tubeInfo.matrixRoomId}/messages?limit=1000`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
    }
  );
  const eventsList = await matrixRoomResponse.json();

  return {
    matrixRoom: {
      roomId: tubeInfo.matrixRoomId,
      events: eventsList.chunk,
    },
    tubeRoom: {
      name: tubeInfo.tubeRoomName,
      events: tubeInfo.tubeRoomEvents,
    },
  };
};

const registerUser = async () => {
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
    const newUser = {
      name: userName,
      userId: registration.user_id,
      accessToken: registration.access_token,
    };

    localStorage.setItem(
      `spacetube-user-${linkToken}`,
      JSON.stringify(newUser)
    );

    return newUser;
  } else {
    console.log("registration failed");
    return;
  }
};

const App = () => {
  const [user, setUser] = useState();
  const [matrixRoom, setMatrixRoom] = useState();
  const [tubeRoom, setTubeRoom] = useState();
  const [message, setMessage] = useState("");
  const [sendDisabled, setSendDisabled] = useState(true);

  console.log(matrixRoom);
  console.log(tubeRoom);
  console.log(message);

  useEffect(() => {
    const storedUser = localStorage.getItem(`spacetube-user-${linkToken}`);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      registerUser().then((user) => setUser(user));
    }
  }, []);

  useEffect(() => {
    const setUpRooms = async () => {
      if (user) {
        const { matrixRoom, tubeRoom } = await getRooms(user);
        setMatrixRoom(matrixRoom);
        setTubeRoom(tubeRoom);
      }
    };

    setUpRooms();
  }, [user]);

  useEffect(() => {
    if (matrixRoom) {
      setSendDisabled(false);
    }
  }, [matrixRoom]);

  const sendEvent = async () => {
    fetch(
      `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${matrixRoom.roomId}/send/m.room.message`,
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

  // rendering events in the rooms
  // scrolling to the bottom

  // checking for new events every second with an interval.
  // gotta be a better way than doing that

  return (
    <>
      <div id="tube-room-container" className="room-container">
        <h1 id="tube-room-title">Tube Room</h1>
        <div
          id="tube-room-events-container"
          className="room-events-container"
        ></div>
      </div>
      <div id="matrix-room-container" className="room-container">
        <h1 id="matrix-room-title">Matrix Room</h1>
        <div
          id="matrix-room-events-container"
          className="room-events-container"
        ></div>
        <div id="new-message-container">
          <input
            type="text"
            id="new-message-text"
            placeholder="..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendEvent();
              }
            }}
          />
          <button id="send-button" onClick={sendEvent} disabled={sendDisabled}>
            ➡️
          </button>
        </div>
      </div>
    </>
  );
};

export default App;
