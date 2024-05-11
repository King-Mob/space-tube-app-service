import { useState, useEffect } from "react";
import {
  getDisplayNameRequest,
  getProfilePictureRequest,
  changeGroupUserRequest,
} from "../requests";

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

    console.log(result);

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
    console.log(profilePicture);

    await changeGroupUserRequest(token, { displayName, profilePicture });
    refresh();
  };

  const objectUrl = profilePicture ? URL.createObjectURL(profilePicture) : "";

  return (
    <>
      <h1>Group User</h1>
      <p>Display Name</p>
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      ></input>
      <p>Profile Picture</p>
      <input
        type="file"
        name="file"
        onChange={(event) => {
          setProfilePicture(event.target.files[0]);
        }}
      ></input>
      {profilePicture && <img src={objectUrl} />}
      <button
        id="update-button"
        disabled={!profilePicture && !displayName}
        onClick={update}
      >
        Update
      </button>
    </>
  );
};

export default GroupUser;
