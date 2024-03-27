import "../styles/app.css";
import { useState, useEffect } from "react";
import {
  createInviteRequest,
  getInviteRequest,
  acceptInviteRequest,
} from "../requests";

const { URL } = process.env;

const InviteCreate = () => {
  const [submitted, setSubmitted] = useState(false);
  const [link, setLink] = useState("");
  const [myMatrixId, setMyMatrixId] = useState("");
  const [myGroupName, setMyGroupName] = useState("");
  const [contactMatrixId, setContactMatrixId] = useState("");

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

  const reset = () => {
    setMyMatrixId("");
    setMyGroupName("");
    setContactMatrixId("");
    setLink("");
    setSubmitted(false);
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
        <label htmlFor="contactMatrixId">Contact's Matrix Id</label>
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
        <p>Send this link to your contact to finish the tube! {link}</p>
        <button onClick={reset} className="home-button">
          Make another tube!
        </button>
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
      acceptInviteRequest(invite, myMatrixId, myGroupName)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) setAccepted(true);
        });
    }
  };

  return (
    <div>
      {errorMessage ? (
        <p>{errorMessage}</p>
      ) : accepted ? (
        <>
          <p>You have accepted the invite, check out your matrix client</p>
        </>
      ) : (
        <>
          <p>
            {contactMatrixId} is inviting you to create a spacetube, connecting{" "}
            {contactGroupName} with your group
          </p>
          <p>to accept, enter your matrix id and your group name below</p>
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
    <div>
      <h1>Welcome to Spacetube</h1>
      <p>You can create your own spacetube here, or join your existing ones</p>
      <h2>Existing Tubes</h2>
      <div>
        {linkTokens.map((token) => (
          <a href={`${URL}?linkToken=${token}`}>
            <p>{token}</p>
          </a>
        ))}
      </div>
      <h2>New tube</h2>
      <div>{invite ? <InviteAccept invite={invite} /> : <InviteCreate />}</div>
    </div>
  );
};

export default Home;
