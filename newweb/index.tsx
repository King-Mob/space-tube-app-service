import "dotenv/config";
import { createRoot } from "react-dom/client";
import App from "./components/App";

console.log("welcome to 🛸s p a c e t u b e🛸");

const root = createRoot(document.getElementById("app"));
root.render(<App />);

console.log(process.env.HOME_SERVER);
