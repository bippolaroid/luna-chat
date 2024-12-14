/* @refresh reload */
import { Router, Route } from "@solidjs/router";
import { render } from "solid-js/web";
import "./index.css";
import Chat from "./pages/Chat.tsx";

const root = document.getElementById("root");

render(() => (
    <Router>
        <Route path={["/", "/chat"]} component={Chat} />
    </Router>
), root!);
