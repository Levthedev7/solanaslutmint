import HomePage from "./pages/HomePage";
import MintPage from "./components/MintPage";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import "./css/style.css"

function App() {
    return (
        <div>
            <Router>
                <Switch>
                    <Route exact path="/" component={HomePage} />

                    <Route exact path="/mint" component={HomePage} />
                    
                    {/* <Route exact path="/mint" component={MintPage} /> */}
                </Switch>
            </Router>
        </div>
    );
}

export default App;
