import {
  LandingBuiltOn,
  LandingCta,
  LandingFaq,
  LandingFooter,
  LandingHero,
  LandingHowItWorks,
  LandingPrivacyBoundaries,
  LandingWhyTirai,
} from "./components";

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingHero />
      <LandingBuiltOn />
      <LandingWhyTirai />
      <LandingHowItWorks />
      <LandingPrivacyBoundaries />
      <LandingFaq />
      <LandingCta />
      <LandingFooter />
    </div>
  );
}
