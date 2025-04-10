import { useEffect, useState } from "react";

const randomXY = () => {
    const body = document.body;
    const html = document.documentElement;
    const height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
    );

    return {
        x: Math.round(Math.random() * 90) + 5,
        y: Math.round(Math.random() * 0.9 * height) + 5,
    };
};

const Stars = () => {
    const [stars, setStars] = useState([]);

    const createStars = () => {
        const stars = [];
        for (let i = 0; i < 30; i++) {
            stars.push(randomXY());
        }
        setStars(stars);
    };

    useEffect(() => {
        createStars();
    }, []);

    return stars.map((star, i) => (
        <p className="star" style={{ left: `${star.x}%`, top: `${star.y}px` }} key={"" + star.x + star.y + i}>
            ⭐
        </p>
    ));
};

export default Stars;
