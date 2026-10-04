const SAMPLE_LOOK = [
  { brand: 'Toteme', piece: 'Camel wool coat' },
  { brand: 'The Row', piece: 'Poplin shirt' },
  { brand: 'Khaite', piece: 'Barrel-leg jeans' },
  { brand: 'Loafers', piece: 'To buy' },
];

const FEATURES = [
  {
    title: 'Three looks each morning',
    body: 'Outfits built from pieces you already own, styled for the weather where you are and whatever the day holds.',
  },
  {
    title: "This season's trends, applied to you",
    body: 'Articles from the publications you follow, read against your wardrobe: which of your pieces fit, and the one thing worth adding.',
  },
  {
    title: 'Pack for any trip',
    body: 'Tell it where you are going and for how long. It packs a small capsule that works together, with a look for every day.',
  },
];

/**
 * Signed-out introduction: what Atelier Edit does, shown beside the sign-in card.
 */
export function LandingHero({ onCreateAccount }: { onCreateAccount: () => void }) {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <p className="landing-eyebrow">A personal stylist for the clothes you own</p>
      <h2 id="landing-title" className="landing-title">Get dressed from your own wardrobe.</h2>
      <p className="landing-lede">
        Photograph your pieces once. Atelier Edit suggests outfits from them, styled for the weather, your plans and
        this season&apos;s trends, and learns what you love.
      </p>
      <button type="button" className="accent-button landing-cta" onClick={onCreateAccount}>
        Create your account
      </button>

      <div className="landing-sample" aria-label="Example look">
        <p className="landing-sample-label">Example look · Tuesday, 12°C, light rain</p>
        <ul>
          {SAMPLE_LOOK.map((item) => (
            <li key={item.brand + item.piece}>
              <span>{item.brand}</span>
              <strong>{item.piece}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LandingFeatures() {
  return (
    <section className="landing-features" aria-label="What Atelier Edit does">
      {FEATURES.map((feature, i) => (
        <div key={feature.title} className="landing-feature">
          <span className="landing-feature-number">0{i + 1}</span>
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
        </div>
      ))}
      <p className="landing-privacy">
        Your wardrobe is private to you. Download or delete your data at any time from your profile.
      </p>
    </section>
  );
}
