const scene = document.querySelector('.dustscene');

function getRandomColor() {
  const hue = Math.random() * 360;
  const saturation = 70 + Math.random() * 30;
  const lightness = 60 + Math.random() * 20;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function createDustParticle() {
  const particle = document.createElement('div');
  particle.className = 'dust-particle';

  const size = Math.random() * 3 + 2; // 2px to 5px
  const startY = Math.random() * window.innerHeight;
  const speed = Math.random() * 3 + 4; // 4 to 7 px per frame

  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.backgroundColor = getRandomColor();
  particle.style.left = '-10px';
  particle.style.top = `${startY}px`;
  particle.style.opacity = '0.8';

  scene.appendChild(particle);

  let x = -10;

  function animate() {
    x += speed;
    if (x > window.innerWidth + 10) {
      particle.remove();
      return;
    }
    particle.style.left = `${x}px`;
    requestAnimationFrame(animate);
  }

  animate();
}

function startGeneratingDust() {
  setInterval(() => {
    for (let i = 0; i < 5; i++) {
      createDustParticle();
    }
  }, 50); // Generate multiple particles every 50ms
}

startGeneratingDust();