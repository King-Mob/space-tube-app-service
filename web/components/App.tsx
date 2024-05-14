import Messenger from "./Messenger";
import Home from "./Home";
import GroupUser from "./GroupUser";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const linkToken = urlParams.get("linkToken");
const userName = urlParams.get("name");
const invite = urlParams.get("invite");
const groupUserEditToken = urlParams.get("groupUserEditToken");

const App = () => {
  const storedLinkTokens = localStorage.getItem("linkTokens");

  if (storedLinkTokens) {
    const linkTokens = JSON.parse(storedLinkTokens);
    if (!linkTokens.includes(linkToken) && linkToken) {
      linkTokens.push(linkToken);
      localStorage.setItem("linkTokens", JSON.stringify(linkTokens));
    }
  } else {
    if (linkToken)
      localStorage.setItem("linkTokens", JSON.stringify([linkToken]));
  }

  if (groupUserEditToken) return <GroupUser token={groupUserEditToken} />;

  if (linkToken) return <Messenger linkToken={linkToken} userName={userName} />;

  return <Home storedLinkTokens={storedLinkTokens} invite={invite} />;
};

export default App;
