import { useState } from "react";

const CopyInput = ({ value, type }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
  };

  return (
    <>
      <input
        className="home-input"
        type="text"
        value={value}
        readOnly={true}
      ></input>
      <button className="home-button" onClick={copy}>
        Copy {type}
      </button>
      {copied && <p>{type} copied!</p>}
    </>
  );
};

export default CopyInput;
