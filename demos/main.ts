const app = document.querySelector('#app')

app.innerHTML = `
  <div class="landing">
    <div>
      <h1 class="landing__title">>>flyby-motion</h1>
      <p class="landing__subtitle">Choose a demo to explore:</p>
      <div class="landing__buttons">
        <a href="/demos/2d/index.html" class="landing__buttons-btn landing__buttons-btn--2d">
          2D Demo (PixiJS)
        </a>
        <a href="/demos/3d/index.html" class="landing__buttons-btn landing__buttons-btn--3d">
          3D Demo (Three.js)
        </a>
      </div>
      <p class="landing__note">Dev-only demos — not included in the published package.</p>
    </div>
  </div>
`
