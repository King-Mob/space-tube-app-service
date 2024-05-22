import "../styles/app.css";
import { useState, useEffect } from "react";
import { event } from "../../types";
import {
  createGroupUserRequest,
  createInviteRequest,
  getInviteRequest,
  acceptInviteRequest,
  getDisplayNamesRequest,
} from "../requests";
import Stars from "./Stars";
import CopyInput from "./CopyInput";

const { URL } = process.env;

const TubeLink = ({ token }) => {
  const [tubeName, setTubeName] = useState("loading participants...");

  const getTubeName = async () => {
    const tubeInfoResponse = await getDisplayNamesRequest(token);
    const { displayNames } = await tubeInfoResponse.json();

    setTubeName("🛸" + displayNames.join(","));
  };

  useEffect(() => {
    getTubeName();
  }, []);

  return (
    token && (
      <a href={`/?linkToken=${token}`} key={token}>
        <h3>{tubeName}</h3>
      </a>
    )
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
      <h2>Create Group User</h2>
      {inProgress ? (
        <p>Creating group user...</p>
      ) : created ? (
        <>
          <p>
            Your group user has been created. To use spacetube on Matrix, copy
            the user id below and invite it to your chat.
          </p>
          <CopyInput value={groupMatrixId} type={"Group User ID"} />
          {<InviteCreate groupUserId={groupMatrixId} groupName={groupName} />}
        </>
      ) : (
        <>
          <p>
            The first step to using spacetube. Your group user will send
            messages and perform actions on behalf of your group.
          </p>
          <input
            className="home-input"
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createUser();
            }}
          ></input>
          <button
            onClick={createUser}
            disabled={!groupName}
            className="home-button"
          >
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

  const createInvite = () => {
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

  if (!submitted)
    return (
      <>
        <p>Or enter your name and get a web invite:</p>
        <input
          id="myName"
          className="home-input"
          type="text"
          placeholder="Name"
          value={myName}
          onChange={(e) => setMyName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") createInvite();
          }}
        ></input>
        <button
          id="create-button"
          className="home-button"
          onClick={createInvite}
          disabled={!myName}
        >
          Create
        </button>
      </>
    );

  if (submitted && !link)
    return (
      <>
        <p>Generating link...</p>
      </>
    );

  if (submitted && link)
    return (
      <>
        <p>Send this link to your contact to finish the tube.</p>
        <CopyInput value={link} type={"invite link"} />
        <p>
          Use <a href={`/?linkToken=${linkToken}&name=${myName}`}>this link</a>{" "}
          to view your side of the tube once they've accepted the invite.
        </p>
        <CopyInput
          value={`${URL}/?linkToken=${linkToken}&name=${myName}`}
          type="my link"
        />
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
    <>
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
    </>
  );
};

const Home = ({ storedLinkTokens, invite }) => {
  const linkTokens = storedLinkTokens ? JSON.parse(storedLinkTokens) : [];

  return (
    <div id="home-container">
      <Stars />
      <header>
        <h1 id="title">Space tube</h1>
        <p>Life is better in tubes.</p>
      </header>
      <div id="actions-container">
        <div className="form-container">
          {invite ? <InviteAccept invite={invite} /> : <GroupUserCreate />}
        </div>
        {linkTokens.length > 0 && (
          <div className="form-container">
            <h2>Group Connections</h2>
            <div id="tube-link-container">
              {linkTokens.map((token) => (
                <TubeLink token={token} />
              ))}
            </div>
          </div>
        )}
      </div>
      <footer>
        <p>
          <a href="https://spacetu.be">Read more</a> about spacetube.
        </p>
      </footer>
    </div>
  );
};

export default Home;
