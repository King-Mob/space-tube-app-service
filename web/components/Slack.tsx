import { useState, useEffect } from "react";
import Stars from "./Stars";
import { processSlackRequest } from "../requests";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const slack_code = urlParams.get("code");

const Slack = () => {
  const [success, setSuccess] = useState(false);

  const processCode = async () => {
    const processSlackResponse = await processSlackRequest(slack_code);
    const processSlackResult = await processSlackResponse.json();

    if (processSlackResult.success) setSuccess(true);
  };

  useEffect(() => {
    processCode();
  }, []);

  return (
    <div>
      <Stars />
      <h1>Thanks for Installing Spacetube on Slack</h1>
      <p>you won't regret this</p>
      {success ? (
        <>
          <p>slack OAuth Code processed successfully!</p>
          <p>Now create the slack channel you want to use spacetube in.</p>
          <p>Invite @spacetube to the channel</p>
          <p>
            And use <span>@spacetube !connect your-invite-code</span> to join a
            tube!
          </p>
        </>
      ) : (
        <p>Processing slack OAuth Code</p>
      )}
    </div>
  );
};

export default Slack;
