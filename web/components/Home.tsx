import "../styles/app.css";
import { useState, useEffect } from "react";
import { event } from "../../types";
import {
  createGroupUserRequest,
  createInviteRequest,
  getInviteRequest,
  acceptInviteRequest,
  getTubeInfoRequest,
} from "../requests";
import Stars from "./Stars";

const TubeLink = ({ token }) => {
  const [tubeName, setTubeName] = useState("loading participants...");

  const getTubeName = async () => {
    const tubeInfoResponse = await getTubeInfoRequest(token);
    const { tubeRoomEvents } = await tubeInfoResponse.json();

    const groupUserNames = [];

    tubeRoomEvents.map((event: event) => {
      if (
        event.type === "m.room.member" &&
        event.content.displayname &&
        !event.sender.includes("@space-tube-bot")
      ) {
        const displayName = event.content.displayname;
        groupUserNames.push(displayName);
      }
      return null;
    });

    setTubeName(groupUserNames.join(","));
  };

  useEffect(() => {
    getTubeName();
  }, []);

  return (
    <a href={`/?linkToken=${token}`} key={token}>
      <h3>{tubeName}</h3>
    </a>
  );
};

const GroupUserCreate = () => {
  const [groupName, setGroupName] = useState("");
  const [inProgress, setInProgress] = useState(false);
  const [created, setCreated] = useState(false);
  const [groupMatrixId, setGroupMatrixId] = useState("");

  const createUser = async () => {
    if (groupName) {
      setInProgress(true);
      const createGroupUserResponse = await createGroupUserRequest(groupName);
      const { groupId } = await createGroupUserResponse.json();
      setGroupMatrixId(groupId);
      setCreated(true);
      setInProgress(false);
    }
  };

  return (
    <>
      <h2>Create a group user</h2>
      {inProgress ? (
        <p>Creating group user...</p>
      ) : created ? (
        <>
          <p>
            Your group user has been created. To use spacetube on Matrix, invite{" "}
            <a>{groupMatrixId}</a>to your chat.
          </p>
          <p>
            Otherwise, to continue on web, enter your name and we'll create a
            web invite.
          </p>
          {<InviteCreate groupUserId={groupMatrixId} groupName={groupName} />}
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createUser();
            }}
          ></input>
          <button onClick={createUser} disabled={!groupName}>
            Create
          </button>
        </>
      )}
    </>
  );
};

const InviteCreate = ({ groupUserId, groupName }) => {
  const [submitted, setSubmitted] = useState(false);
  const [link, setLink] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const [myName, setMyName] = useState("");
  const [copied, setCopied] = useState(false);

  const create = () => {
    setSubmitted(true);
    createInviteRequest(myName, groupUserId, groupName)
      .then((response) => response.json())
      .then((result) => {
        if (result.inviteLink) {
          setLink(result.inviteLink);
          setLinkToken(result.linkToken);
        }
      });
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
  };

  if (!submitted)
    return (
      <>
        <label htmlFor="myName">My Name</label>
        <input
          id="myName"
          className="home-input"
          type="text"
          placeholder="my name"
          value={myName}
          onChange={(e) => setMyName(e.target.value)}
        ></input>
        <button
          id="create-button"
          className="home-button"
          onClick={create}
          disabled={!myName}
        >
          Create
        </button>
      </>
    );

  if (submitted && !link)
    return (
      <>
        <p>generating link</p>
      </>
    );

  if (submitted && link)
    return (
      <>
        <p>
          Send this link to your contact to finish the tube!{" "}
          <a href={link}>{link}</a>
        </p>
        <button onClick={copy} className="home-button">
          Copy link
        </button>
        {copied && <p>Copied!</p>}
        <p>
          Use this link to view the room once they've accepted the invite:{" "}
          <a href={`/?linkToken=${linkToken}&name=${myName}`}>view room</a>
        </p>
      </>
    );
};

const InviteAccept = ({ invite }) => {
  const [myName, setMyName] = useState("");
  const [myGroupName, setMyGroupName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactGroupName, setContactGroupName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [linkToken, setLinkToken] = useState("");

  useEffect(() => {
    getInviteRequest(invite)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          console.log(result);
          setContactName(result.invitation.content.from.name);
          setContactGroupName(result.invitation.content.from.groupName);
        } else {
          setErrorMessage(result.message);
        }
      });
  }, []);

  const accept = () => {
    if (myName && myGroupName) {
      setAccepted(true);
      acceptInviteRequest(invite, myName, myGroupName)
        .then((res) => res.json())
        .then((result) => {
          console.log(result);
          if (result.success) {
            setLinkToken(result.linkToken);
          }
        });
    }
  };

  return (
    <div>
      {errorMessage ? (
        <p>{errorMessage}</p>
      ) : accepted ? (
        linkToken ? (
          <meta
            http-equiv="Refresh"
            content={`0; url='/?linkToken=${linkToken}&name=${myName}'`}
          />
        ) : (
          <>
            <p>
              Accepting invite, building rooms, inviting users, this takes a few
              seconds...
            </p>
          </>
        )
      ) : (
        <>
          <p>
            {contactName} is inviting you to create a spacetube, connecting{" "}
            {contactGroupName} with your group.
          </p>
          <p>Enter your name and your group name below to accept</p>
          <label htmlFor="myName">My Name</label>
          <input
            id="myName"
            className="home-input"
            type="text"
            placeholder="my name"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
          ></input>
          <label htmlFor="myGroupName">My Group Name</label>
          <input
            id="myGroupName"
            className="home-input"
            type="text"
            placeholder="my group's name"
            value={myGroupName}
            onChange={(e) => setMyGroupName(e.target.value)}
          ></input>
          <button
            onClick={accept}
            className="home-button"
            disabled={!myName || !myGroupName}
          >
            Accept Invite
          </button>
        </>
      )}
    </div>
  );
};

const Home = ({ storedLinkTokens, invite }) => {
  const linkTokens = storedLinkTokens ? JSON.parse(storedLinkTokens) : [];

  return (
    <div id="home-container">
      <Stars />
      <h1 id="title">Space tube</h1>
      {linkTokens.length > 0 && (
        <div>
          <h2>My Tubes</h2>
          {linkTokens.map((token) => (
            <TubeLink token={token} />
          ))}
        </div>
      )}
      <div className="form-container">
        {invite ? <InviteAccept invite={invite} /> : <GroupUserCreate />}
      </div>
    </div>
  );
};

export default Home;
