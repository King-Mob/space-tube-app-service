import "dotenv/config";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./components/App";
import Slack from "./components/Slack";
import Matrix from "./components/Matrix";

console.log("welcome to 🛸s p a c e t u b e🛸");

const root = createRoot(document.getElementById("app"));
root.render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<App />} />
            <Route path="/slack" element={<Slack />} />
            <Route path="/matrix" element={<Matrix />} />
        </Routes>
    </BrowserRouter>
);

console.log(process.env.HOME_SERVER);
