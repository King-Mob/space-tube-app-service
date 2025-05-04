import Stars from "./Stars";
import Header from "./Header";

const Matrix = () => {
  return (
    <div id="slack-container">
      <Stars />
      <Header />
      <div id="instructions-container">
        <h2>Matrix Instructions</h2>
        <p>Spacetube on Matrix has a simple set-up with 3 steps:</p>
        <p>1. Add the Spacetube bot to your room</p>
        <p>
          2. Create or connect to a tube by sending <span>@spacetube</span> or{" "}
          <span>@spacetube invite-code-here</span>
        </p>
        <p>
          3. Start sending messages by sending{" "}
          <span>@spacetube your-message-here</span>
        </p>
        <p>Read on for the Matrix Specifics...</p>
        <span className="divider"></span>
        <h3 className="center">Add the Spacetube bot to your room </h3>
        <p>
          1. Create the room you want to use Spacetube in. IMPORTANT:{" "}
          <span>TOGGLE END-TO-END ENCRYPTION OFF</span>. THE BOT CANNOT USE E2EE
          YET. It's convenient to name the room after the group you're going to
          talk to.
        </p>
        <p>
          2. Invite <span>@spacetube_bot:spacetu.be</span> to the room.
        </p>
        <p className="center">Once that's done, EITHER:</p>
        <p>1. Copy the invite code you received from someone else.</p>
        <p>
          2. Send @spacetube followed by the invite code you received to the
          room. It should look like <span>@spacetube invite-code-here</span>
        </p>
        <p className="center">OR</p>
        <h3 className="center">Create a new tube</h3>
        <p>
          1. Send <span>@spacetube</span> in the room to make a new tube!
          Spacetube will make a new invite code for you. You can customise your
          invite code by sending <span>@spacetube custom-invite-code-here</span>{" "}
          instead when you make the tube.
        </p>
        <p>
          2. Share the invite code with someone in the group you want to connect
          to. Now they need to do the next part.
        </p>
        <h3 className="center">Connect to an existing tube</h3>

        <p className="center">FINALLY</p>
        <h3 className="center">Send messages</h3>
        <p>
          Send messages by sending <span>@spacetube what's up earthlings?</span>{" "}
          in the room and everything after @spacetube will be forwarded to those
          in the tube.
        </p>
        <h2>Happy tubing!</h2>
      </div>
    </div>
  );
};

export default Matrix;
