import { useState, useEffect } from "react";
import {
  getDisplayNameRequest,
  getProfilePictureRequest,
  changeGroupUserRequest,
} from "../requests";
import Stars from "./Stars";

const GroupUser = ({ token }) => {
  const [displayName, setDisplayName] = useState("");
  const [profilePicture, setProfilePicture] = useState<File>(null);

  const getDisplayName = async () => {
    const response = await getDisplayNameRequest(token);
    const result = await response.json();

    setDisplayName(result.name);
  };

  const getProfilePicture = async () => {
    const response = await getProfilePictureRequest(token);
    const result = await response.blob();

    const image = new File([result], "profile-picture.jpg");

    setProfilePicture(image);
  };

  const refresh = () => {
    getDisplayName();
    getProfilePicture();
  };

  useEffect(() => {
    refresh();
  }, []);

  const update = async () => {
    await changeGroupUserRequest(token, { displayName, profilePicture });
    refresh();
  };

  const objectUrl = profilePicture ? URL.createObjectURL(profilePicture) : "";

  return (
    <div id="edit-user-container">
      <header>
        <h1 id="title">Space tube</h1>
        <p>Life is better in tubes.</p>
      </header>
      <Stars />
      <h2>Group User Profile</h2>
      <div id="profile-container">
        <input
          hidden
          id="uploadInput"
          type="file"
          name="file"
          onChange={(event) => {
            setProfilePicture(event.target.files[0]);
          }}
        ></input>
        {profilePicture ? (
          <img
            className="profile-picture"
            src={objectUrl}
            onClick={() => document.getElementById("uploadInput").click()}
          />
        ) : (
          <div
            className="profile-picture empty"
            onClick={() => document.getElementById("uploadInput").click()}
          >
            <p>🎭</p>
          </div>
        )}
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="home-input"
          placeholder="Display Name"
        ></input>
      </div>
      <button
        className="home-button"
        id="update-button"
        disabled={!profilePicture && !displayName}
        onClick={update}
      >
        Save
      </button>
    </div>
  );
};

export default GroupUser;
