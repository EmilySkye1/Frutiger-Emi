(function() {
  const bootScreen = document.getElementById('boot-screen');
  const introWrap = document.getElementById('intro-video-wrap');
  const introVideo = document.getElementById('intro-video');
  const skipBtn = document.getElementById('skip-intro');
  const desktop = document.getElementById('desktop');

  desktop.classList.add('booting');

  function startIntro() {
    bootScreen.classList.add('hidden');
    setTimeout(() => {
      bootScreen.style.display = 'none';
      introWrap.classList.add('visible');
      const playPromise = introVideo.play();
      introVideo.muted = false;
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {
          introVideo.play();
        });
      }
    }, 600);
  }

  function finishIntro() {
    introWrap.classList.add('hidden');
    setTimeout(() => {
      introWrap.style.display = 'none';
      desktop.classList.remove('booting');
    }, 500);
  }

  introVideo.addEventListener('ended', finishIntro);
  introVideo.addEventListener('error', finishIntro);

  skipBtn.addEventListener('click', () => {
    introVideo.pause();
    finishIntro();
  });

  setTimeout(startIntro, 1800);
})();
