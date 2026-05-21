import React from "react";
import { createRoot } from "react-dom/client";
import EventAssistant from "../Eventassistant/Eventassistant.jsx";

createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <EventAssistant />
  </React.StrictMode>
);
