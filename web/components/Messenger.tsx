import "../styles/app.css";
import { useState, useEffect, useRef } from "react";
import {
  getTubeInfoRequest,
  getRoomRequest,
  registerRequest,
  sendMessageRequest,
  forwardMessageRequest,
  syncRequest,
  syncTubeRequest,
} from "../requests";

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

const getTubeRoom = async (linkToken) => {
  const tubeInfoResponse = await getTubeInfoRequest(linkToken);
  const tubeInfo = await tubeInfoResponse.json();

  return tubeInfo;
};

const getMatrixRoom = async (user, tubeInfo) => {
  const matrixRoomResponse = await getRoomRequest(user, tubeInfo);
  const eventsList = await matrixRoomResponse.json();
  const connectedEvents = connectLinkedEvents(eventsList.chunk);

  return connectedEvents;
};

const getRooms = async (user, linkToken) => {
  const tubeInfo = await getTubeRoom(linkToken);
  const connectedEvents = await getMatrixRoom(user, tubeInfo);

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

const registerUser = async (userName, linkToken) => {
  const response = await registerRequest(linkToken, userName);
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

type User = { name: ""; userId: ""; accessToken: "" };
type MatrixRoom = { roomId: ""; events: [any] };
type TubeRoom = { name: ""; events: [any] };

const Messenger = ({ linkToken, userName }) => {
  const [user, setUser] = useState<User | null>(null);
  const [matrixRoom, setMatrixRoom] = useState<MatrixRoom | null>(null);
  const [tubeRoom, setTubeRoom] = useState<TubeRoom | null>(null);
  const [message, setMessage] = useState("");
  const [sendDisabled, setSendDisabled] = useState(true);
  const tubeMessageEnd = useRef();
  const matrixMessageEnd = useRef();

  const syncLoopTube = async (linkToken, nextBatch = null) => {
    const syncTubeResponse = await syncTubeRequest(linkToken, nextBatch);
    const syncData = await syncTubeResponse.json();

    if (syncData.rooms) {
      setUpRooms();
    }

    syncLoopTube(linkToken, syncData.next_batch);
  };

  const syncLoop = async (user, nextBatch) => {
    const syncResponse = await syncRequest(user, nextBatch);
    const syncData = await syncResponse.json();

    if (syncData.rooms && matrixRoom)
      if (syncData.rooms.join[matrixRoom.roomId]) {
        setUpRooms();
      }

    syncLoop(user, syncData.next_batch);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem(`spacetube-user-${linkToken}`);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      registerUser(userName, linkToken).then((user) => setUser(user));
    }
  }, []);

  useEffect(() => {
    if (user) {
      syncLoop(user, "");
      syncLoopTube(linkToken);
    }
  }, [user]);

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
      const { tubeRoom, matrixRoom } = await getRooms(user, linkToken);
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

  const sendEvent = async () => {
    sendMessageRequest(matrixRoom, message, user);

    setMessage("");
    setUpRooms();
  };

  const forward = async (event) => {
    if (confirm("Send this message to the tube?")) {
      const txnId = self.crypto.randomUUID();

      await forwardMessageRequest(matrixRoom, txnId, event, user);
    }
  };

  const tubeRoomNames = {};

  const tubeRoomEvents =
    tubeRoom &&
    tubeRoom.events.map((event) => {
      if (event.type === "m.room.message") {
        return (
          <div className="message-container" key={event.event_id}>
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
          <div
            className="message-container"
            onClick={() => forward(event)}
            key={event.event_id}
          >
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
  const tubeRoomTitle = "🛸" + roomParticipants.join(",");

  return (
    <div id="messenger-container">
      <div id="tube-room-container" className="room-container">
        <h1 id="tube-room-title" className="room-title">
          {tubeRoomTitle || "Tube Room"}
        </h1>
        <div id="tube-room-events-container" className="room-events-container">
          {tubeRoomEvents}
          <div ref={tubeMessageEnd} />
        </div>
      </div>
      <div id="matrix-room-container" className="room-container">
        <h1 id="matrix-room-title" className="room-title">
          {matrixRoomTitle || "Matrix Room"}
        </h1>
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
            placeholder="new message here, click on prev messages to forward"
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
    </div>
  );
};

export default Messenger;
