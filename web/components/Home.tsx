import "../styles/app.css";

const { HOME_SERVER } = process.env;
const url = `https://spacetube.${HOME_SERVER}`;

const Home = ({ storedLinkTokens }) => {
  const linkTokens = storedLinkTokens ? JSON.parse(storedLinkTokens) : [];

  return (
    <div>
      <h1>Welcome to Spacetube</h1>
      <p>You can create your own spacetube here, or join your existing ones</p>
      <h2>Existing Tubes</h2>
      <div>
        {linkTokens.map((token) => (
          <a href={`${url}?linkToken=${token}`}>
            <p>{token}</p>
          </a>
        ))}
      </div>
      <h2>New tube</h2>
      <div>
        <p>form</p>
      </div>
    </div>
  );
};

export default Home;
