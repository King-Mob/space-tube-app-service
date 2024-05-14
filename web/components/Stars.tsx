const documentHeight = document.documentElement.scrollHeight;

const randomXY = () => {
  return {
    x: Math.round(Math.random() * 90) + 5,
    y: Math.round(Math.random() * 0.9 * documentHeight) + 5,
  };
};

const stars = [
  randomXY(),
  randomXY(),
  randomXY(),
  randomXY(),
  randomXY(),
  randomXY(),
  randomXY(),
  randomXY(),
  randomXY(),
  randomXY(),
  randomXY(),
  randomXY(),
];

const Stars = () => {
  return stars.map((star) => (
    <p className="star" style={{ left: `${star.x}%`, top: `${star.y}px` }}>
      ⭐
    </p>
  ));
};

export default Stars;
