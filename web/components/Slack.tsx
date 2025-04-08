import { useState, useEffect } from "react";
import Stars from "./Stars";
import Header from "./Header";
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
        if (slack_code) processCode();
    }, []);

    return (
        <div id="slack-container">
            <Stars />
            <Header />
            <div id="instructions-container">
                <h2>Slack Instructions</h2>
                <p>Spacetube on Slack has a simple set-up with 3 steps:</p>
                <p>1. Add the Spacetube plugin to your team's platform.</p>
                <p>
                    2. Create or connect to a tube using the <span>@spacetube !create</span> or{" "}
                    <span>@spacetube !connect</span> commands.
                </p>
                <p>
                    3. Start sending messages by sending <span>@spacetube your-message-here</span> before the message.
                </p>
                <p>Read on for the Slack Specifics.</p>
                <span className="divider"></span>
                <h3 className="center">Add the Spacetube plugin</h3>
                {slack_code ? (
                    success ? (
                        <>
                            <p>Spacetube has been added to your slack!</p>
                            <p className="center">Now that's done...</p>
                        </>
                    ) : (
                        <>
                            <p>Fetching authorisation from Slack...</p>
                            <p className="center">Once that's done...</p>
                        </>
                    )
                ) : (
                    <>
                        <p>
                            Add Spacetube to your slack by following the{" "}
                            <a href="https://slack.com/oauth/v2/authorize?client_id=4433579405958.8709202233781&scope=app_mentions:read,chat:write,chat:write.customize,reactions:read,team:read,users.profile:read">
                                Slack authorisation flow here
                            </a>
                            . Or click this big button:
                        </p>
                        <a
                            id="slack-button"
                            href="https://slack.com/oauth/v2/authorize?client_id=4433579405958.8709202233781&scope=app_mentions:read,chat:write,chat:write.customize,reactions:read,team:read,users.profile:read&user_scope="
                        >
                            <img
                                alt="Add to Slack"
                                height="40"
                                width="139"
                                src="https://platform.slack-edge.com/img/add_to_slack.png"
                                srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
                            />
                        </a>
                        <p>Afterwards, Slack will send you back to this page. See you soon!</p>

                        <p className="center">Once that's done...</p>
                    </>
                )}

                <p>
                    1. Create the slack channel you want to use Spacetube in. It's convenient to name it after the group
                    you're going to talk to.
                </p>
                <p>
                    2. Invite @spacetube to the channel. You can use <span>/invite @spacetube</span>.
                </p>
                <p className="center">Once that's done, EITHER:</p>
                <h3 className="center">Create a new tube</h3>
                <p>
                    1. Send <span>@spacetube !create your-optional-custom-invite-code-here</span> in the Slack channel
                    to make a tube! You can leave out the custom invite code and spacetube will make one for you.
                </p>
                <p>
                    2. Share the invite code with someone in the group you want to connect to. Now they need to do the
                    next part.
                </p>
                <p className="center">OR</p>
                <h3 className="center">Connect to an existing tube</h3>
                <p>1. Copy the invite code you received from someone else.</p>
                <p>
                    2. Use the code and send <span>@spacetube !connect received-invite-code-here</span> in the Slack
                    channel to connect to their tube.
                </p>
                <p className="center">FINALLY</p>
                <h3 className="center">Send messages</h3>
                <p>
                    Send messages by sending <span>@spacetube what's up earthlings?</span> in the Slack channel and
                    everything after @spacetube will be forwarded to those in the tube.
                </p>
                <h2>Happy tubing!</h2>
            </div>
        </div>
    );
};

export default Slack;
