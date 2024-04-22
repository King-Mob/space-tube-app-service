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
  getTubeUserIdsRequest,
  matrixRoomInviteRequest,
} from "../requests";

const Invite = ({ user, roomId }) => {
  const openInvitePrompt = () => {
    const userInviteId = window.prompt("Enter user id to invite:");
    matrixRoomInviteRequest(user, userInviteId, roomId);
  };

  return <button onClick={openInvitePrompt}>🧍+</button>;
};

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

const getMatrixRoom = async (user, matrixRoomId) => {
  const matrixRoomResponse = await getRoomRequest(user, matrixRoomId);
  const eventsList = await matrixRoomResponse.json();
  const connectedEvents = connectLinkedEvents(eventsList.chunk);

  return {
    roomId: matrixRoomId,
    events: connectedEvents,
  };
};

const getTubeRoom = async (linkToken) => {
  const tubeInfoResponse = await getTubeInfoRequest(linkToken);
  const tubeInfo = await tubeInfoResponse.json();

  return {
    name: tubeInfo.tubeRoomName,
    events: tubeInfo.tubeRoomEvents,
  };
};

const getTubeUserIds = async (linkToken) => {
  const tubeUserIdsResponse = await getTubeUserIdsRequest(linkToken);
  const { tubeUserIds } = await tubeUserIdsResponse.json();

  console.log(tubeUserIds);

  return tubeUserIds;
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
type MatrixRoom = { roomId: ""; events: any[] };
type TubeRoom = { name: ""; events: any[] };

const Messenger = ({ linkToken, userName }) => {
  const [user, setUser] = useState<User | null>(null);
  const [matrixRoomId, setMatrixRoomId] = useState<string | null>(null);
  const [matrixRoom, setMatrixRoom] = useState<MatrixRoom | null>(null);
  const [tubeRoom, setTubeRoom] = useState<TubeRoom | null>(null);
  const [tubeUserIds, setTubeUserIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sendDisabled, setSendDisabled] = useState(true);
  const tubeMessageEnd = useRef();
  const matrixMessageEnd = useRef();

  console.log(tubeUserIds);

  const syncLoopTube = async (linkToken, nextBatch = null) => {
    const syncTubeResponse = await syncTubeRequest(linkToken, nextBatch);
    const syncData = await syncTubeResponse.json();

    if (syncData.matrixRoomId !== matrixRoomId) {
      setMatrixRoomId(syncData.matrixRoomId);
    }

    if (syncData.rooms) {
      getTubeRoom(linkToken).then((tubeRoom) => setTubeRoom(tubeRoom));
      getTubeUserIds(linkToken).then((ids) => setTubeUserIds(ids));
    }

    syncLoopTube(linkToken, syncData.next_batch);
  };

  const syncLoop = async (user, nextBatch) => {
    const syncResponse = await syncRequest(user, nextBatch);
    const syncData = await syncResponse.json();

    if (syncData.rooms)
      if (syncData.rooms.join[matrixRoomId]) {
        getMatrixRoom(user, matrixRoomId).then((matrixRoom) =>
          setMatrixRoom(matrixRoom)
        );
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
      syncLoopTube(linkToken);
      if (matrixRoomId) {
        syncLoop(user, "");
        setSendDisabled(false);
      }
    }
  }, [user, matrixRoomId]);

  useEffect(() => {
    if (tubeMessageEnd) {
      tubeMessageEnd.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [tubeRoom]);

  useEffect(() => {
    if (matrixMessageEnd) {
      matrixMessageEnd.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [matrixRoom]);

  const sendEvent = async () => {
    sendMessageRequest(matrixRoom, message, user);
    setMessage("");
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
  let matrixRoomTitle: string;

  const matrixRoomEvents =
    matrixRoom &&
    matrixRoom.events.map((event) => {
      if (event.type === "m.room.name") {
        matrixRoomTitle = "🏠" + event.content.name;
      }
      if (
        event.type === "m.room.message" &&
        !tubeUserIds.includes(event.sender)
      ) {
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
        <div id="matrix-room-title-container">
          <h1 id="matrix-room-title" className="room-title">
            {matrixRoomTitle || "Matrix Room"}
          </h1>
          <Invite user={user} roomId={matrixRoomId} />
        </div>

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
