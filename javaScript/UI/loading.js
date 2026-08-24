window.addEventListener('load', () => {
  const splashScreen = document.getElementById('splash-screen');

  if (splashScreen) {
    setTimeout(() => {
      splashScreen.classList.add('fade-out');

      // Remove do DOM após a animação de fade-out ser concluída
      setTimeout(() => {
        splashScreen.remove();
      }, 1000);
    }, 3000);
  }
});