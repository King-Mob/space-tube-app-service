import Messenger from "./Messenger";
import Home from "./Home";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const linkToken = urlParams.get("linkToken");
const displayName = urlParams.get("name");

const App = () => {
  const storedLinkTokens = localStorage.getItem("linkTokens");

  if (storedLinkTokens) {
    const linkTokens = JSON.parse(storedLinkTokens);
    if (!linkTokens.includes(linkToken)) {
      linkTokens.push(linkToken);
      localStorage.setItem("linkTokens", JSON.stringify(linkTokens));
    }
  } else {
    if (linkToken)
      localStorage.setItem("linkTokens", JSON.stringify([linkToken]));
  }

  if (linkToken)
    return <Messenger linkToken={linkToken} displayName={displayName} />;

  return <Home storedLinkTokens={storedLinkTokens} />;
};

export default App;
