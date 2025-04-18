import { Link } from "react-router";

const Header = () => (
    <Link to="/" id="header-link">
        <header>
            <h1 id="title">
                space<span className="very-small"> </span>tube
            </h1>
            <p>Life is better in tubes.</p>
        </header>
    </Link>
);

export default Header;
