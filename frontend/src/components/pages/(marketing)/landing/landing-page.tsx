import {
  LandingFaq,
  LandingFooter,
  LandingHero,
  LandingHowItWorks,
  LandingPrivacyBoundaries,
} from "./components";

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingHero />
      <LandingHowItWorks />
      <LandingPrivacyBoundaries />
      <LandingFaq />
      <LandingFooter />
    </div>
  );
}
