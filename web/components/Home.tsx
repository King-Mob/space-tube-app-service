import "../styles/app.css";
import { useState, useEffect } from "react";
import {
  createGroupUserRequest,
  createInviteRequest,
  getInviteRequest,
  acceptInviteRequest,
} from "../requests";
import Stars from "./Stars";

const GroupUserCreate = () => {
  const [groupName, setGroupName] = useState("");
  const [inProgress, setInProgress] = useState(false);
  const [created, setCreated] = useState(false);
  const [groupMatrixId, setGroupMatrixId] = useState("");
  const [groupCloneMatrixId, setGroupCloneMatrixId] = useState("");

  const createUser = async () => {
    if (groupName) {
      setInProgress(true);
      const createGroupUserResponse = await createGroupUserRequest(groupName);
      const { groupId, groupCloneId } = await createGroupUserResponse.json();
      setGroupMatrixId(groupId);
      setGroupCloneMatrixId(groupCloneId);
      setCreated(true);
      setInProgress(false);
    }
  };

  return (
    <>
      {inProgress ? (
        <p>Creating group user...</p>
      ) : created ? (
        <p>
          Your group user has been created. Invite {groupMatrixId} to your chat
          and give {groupCloneMatrixId} to other groups you want to talk to.
        </p>
      ) : (
        <>
          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          ></input>
          <button onClick={createUser} disabled={!groupName}>
            Create
          </button>
        </>
      )}
    </>
  );
};

const InviteCreate = () => {
  const [submitted, setSubmitted] = useState(false);
  const [link, setLink] = useState("");
  const [myMatrixId, setMyMatrixId] = useState("");
  const [myGroupName, setMyGroupName] = useState("");
  const [contactMatrixId, setContactMatrixId] = useState("");
  const [copied, setCopied] = useState(false);

  const create = () => {
    console.log(myMatrixId, myGroupName, contactMatrixId);
    setSubmitted(true);
    createInviteRequest(myMatrixId, myGroupName, contactMatrixId)
      .then((response) => response.json())
      .then((result) => {
        if (result.link) {
          setLink(result.link);
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
        <label htmlFor="myMatrixId">My Matrix Id*</label>
        <input
          id="myMatrixId"
          className="home-input"
          type="text"
          placeholder="my matrix user id"
          value={myMatrixId}
          onChange={(e) => setMyMatrixId(e.target.value)}
        ></input>
        <label htmlFor="myGroupName">My Group Name*</label>
        <input
          id="myGroupName"
          className="home-input"
          type="text"
          placeholder="my group's name"
          value={myGroupName}
          onChange={(e) => setMyGroupName(e.target.value)}
        ></input>
        <label htmlFor="contactMatrixId">Contact's Matrix Id (optional)</label>
        <input
          id="contactMatrixId"
          className="home-input"
          type="text"
          placeholder="my contact's matrix user id (optional)"
          value={contactMatrixId}
          onChange={(e) => setContactMatrixId(e.target.value)}
        ></input>
        <button
          id="create-button"
          className="home-button"
          onClick={create}
          disabled={!myMatrixId || !myGroupName}
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
      </>
    );
};

const InviteAccept = ({ invite }) => {
  const [myMatrixId, setMyMatrixId] = useState("");
  const [myGroupName, setMyGroupName] = useState("");
  const [contactMatrixId, setContactMatrixId] = useState("");
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
          setContactMatrixId(result.invitation.content.from.userId);
          setContactGroupName(result.invitation.content.from.groupName);
          setMyMatrixId(result.invitation.content.to.userId);
        } else {
          setErrorMessage(result.message);
        }
      });
  }, []);

  const accept = () => {
    if (myMatrixId && myGroupName) {
      setAccepted(true);
      acceptInviteRequest(invite, myMatrixId, myGroupName)
        .then((res) => res.json())
        .then((result) => {
          console.log(result);
          if (result.success) {
            setLinkToken(result.linkToken);
          }
        });
    }
  };

  const justName = (matrixId) => {
    return matrixId.split("@")[1].split(":")[0];
  };

  return (
    <div>
      {errorMessage ? (
        <p>{errorMessage}</p>
      ) : accepted ? (
        linkToken ? (
          <meta
            http-equiv="Refresh"
            content={`0; url='/?linkToken=${linkToken}&name=${justName(
              myMatrixId
            )}'`}
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
            {contactMatrixId} is inviting you to create a spacetube, connecting{" "}
            {contactGroupName} with your group.
          </p>
          <p>Enter your matrix id and your group name below to accept</p>
          <label htmlFor="myMatrixId">My Matrix Id*</label>
          <input
            id="myMatrixId"
            className="home-input"
            type="text"
            placeholder="my matrix user id"
            value={myMatrixId}
            onChange={(e) => setMyMatrixId(e.target.value)}
          ></input>
          <label htmlFor="myGroupName">My Group Name*</label>
          <input
            id="myGroupName"
            className="home-input"
            type="text"
            placeholder="my group's name"
            value={myGroupName}
            onChange={(e) => setMyGroupName(e.target.value)}
          ></input>
          <button onClick={accept} className="home-button">
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
            <a href={`/?linkToken=${token}`} key={token}>
              <h3>{token}</h3>
            </a>
          ))}
        </div>
      )}
      <div className="form-container">
        <h2>Create a group user</h2>
        <GroupUserCreate />
      </div>
      <div className="form-container">
        <h2>Create a tube</h2>
        {invite ? <InviteAccept invite={invite} /> : <InviteCreate />}
      </div>
    </div>
  );
};

export default Home;
