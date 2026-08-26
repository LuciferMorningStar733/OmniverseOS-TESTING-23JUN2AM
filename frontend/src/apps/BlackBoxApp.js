import React from "react";
import BlackBoxExperience from "../components/BlackBox/BlackBoxExperience";

export default function BlackBoxApp() {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }} data-testid="black-box-app">
      <BlackBoxExperience />
    </div>
  );
}
