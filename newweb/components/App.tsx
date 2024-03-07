import "../styles/app.css";
import { useState, useEffect, useRef } from "react";

const { HOME_SERVER } = process.env;
const url = `https://spacetube.${HOME_SERVER}`;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const linkToken = urlParams.get("linkToken");
const displayName = urlParams.get("name");

const connectLinkedEvents = (events) => {
  const linkedEvents = {};
  events.forEach((event) => {
    if (event.type === "spacetube.forward" && event.content.originalEventId)
      linkedEvents[event.content.originalEventId] = event;
  });
  return events.map((event) => {
    event.connectedEvent = linkedEvents[event.event_id];
    return event;
  });
};

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
  const connectedEvents = connectLinkedEvents(eventsList.chunk);

  return {
    matrixRoom: {
      roomId: tubeInfo.matrixRoomId,
      events: connectedEvents,
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
  const tubeMessageEnd = useRef();
  const matrixMessageEnd = useRef();

  useEffect(() => {
    const storedUser = localStorage.getItem(`spacetube-user-${linkToken}`);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      registerUser().then((user) => setUser(user));
    }
  }, []);

  const scrollToBottom = () => {
    tubeMessageEnd.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
    matrixMessageEnd.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  const setUpRooms = async (scroll = true) => {
    if (user) {
      const { tubeRoom, matrixRoom } = await getRooms(user);
      setTubeRoom(tubeRoom);
      setMatrixRoom(matrixRoom);
      if (scroll) setTimeout(scrollToBottom, 500);
    }
  };

  useEffect(() => {
    setUpRooms();
  }, [user]);

  useEffect(() => {
    if (matrixRoom) {
      setSendDisabled(false);
    }
  }, [matrixRoom]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setUpRooms(false);
    }, 2000);
    return () => clearInterval(intervalId);
  }, []);

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

    setMessage("");
    setUpRooms();
  };

  const forward = async (event) => {
    if (confirm("Send this message to the tube?")) {
      const txnId = self.crypto.randomUUID();

      await fetch(
        `https://matrix.${HOME_SERVER}/_matrix/client/v3/rooms/${matrixRoom.roomId}/send/spacetube.forward/${txnId}?user_id=@${user.userId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            type: "spacetube.forward",
            body: event.content.body,
            originalEventId: event.event_id,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );

      setTimeout(setUpRooms, 200);
    }
  };

  const tubeRoomNames = {};

  const tubeRoomEvents =
    tubeRoom &&
    tubeRoom.events.map((event) => {
      if (event.type === "m.room.message") {
        return (
          <div className="message-container">
            <p className="name">
              {tubeRoomNames[event.sender] || event.sender}
            </p>
            <p>{event.content.body}</p>
          </div>
        );
      }
      if (event.type === "m.room.member" && event.content.displayname) {
        const displayName = event.content.displayname;
        tubeRoomNames[event.sender] = displayName;
      }
      return null;
    });

  const matrixRoomNames = {};
  let matrixRoomTitle;

  const matrixRoomEvents =
    matrixRoom &&
    matrixRoom.events.map((event) => {
      if (event.type === "m.room.name") {
        matrixRoomTitle = "🏠" + event.content.name;
      }
      if (event.type === "m.room.message") {
        return (
          <div className="message-container" onClick={() => forward(event)}>
            <p className="name">
              {matrixRoomNames[event.sender] || event.sender}
            </p>
            <p>{event.content.body}</p>
            {event.connectedEvent && (
              <p className="forwarded">
                forwarded to tube by{" "}
                {matrixRoomNames[event.connectedEvent.sender] ||
                  event.connectedEvent.sender}
              </p>
            )}
          </div>
        );
      }
      if (
        event.type === "m.room.member" &&
        event.content.displayname &&
        event.content.membership === "join"
      ) {
        matrixRoomNames[event.sender] = event.content.displayname;
      }
      return null;
    });

  const roomParticipants = Object.values(tubeRoomNames).filter(
    (name: string) => !name.includes("_")
  );
  const participantList = roomParticipants.join(" + ");
  const tubeRoomTitle = `🛸🛸${participantList}🛸🛸`;

  return (
    <>
      <div id="tube-room-container" className="room-container">
        <h1 id="tube-room-title">{tubeRoomTitle || "Tube Room"}</h1>
        <div id="tube-room-events-container" className="room-events-container">
          {tubeRoomEvents}
          <div ref={tubeMessageEnd} />
        </div>
      </div>
      <div id="matrix-room-container" className="room-container">
        <h1 id="matrix-room-title">{matrixRoomTitle || "Matrix Room"}</h1>
        <div
          id="matrix-room-events-container"
          className="room-events-container"
        >
          {matrixRoomEvents}
          <div ref={matrixMessageEnd} />
        </div>
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
