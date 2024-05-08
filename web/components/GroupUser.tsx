import { useState, useEffect } from "react";
import { getDisplayNameRequest, changeNameRequest } from "../requests";

const GroupUser = ({ token }) => {
  const [displayName, setDisplayName] = useState("");

  const getDisplayName = async () => {
    const response = await getDisplayNameRequest(token);
    const result = await response.json();

    setDisplayName(result.name);
  };

  useEffect(() => {
    getDisplayName();
  }, []);

  const changeName = async () => {
    await changeNameRequest(token, displayName);
    await getDisplayName();
  };

  return (
    <>
      <h1>Group User</h1>
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      ></input>
      <button onClick={changeName}>Change Name</button>
    </>
  );
};

export default GroupUser;
