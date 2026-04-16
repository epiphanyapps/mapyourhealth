export type LandingContent = Record<string, string>;

export type LandingThemeTokens = Record<string, string>;

export type LandingImages = {
  heroMobilePortrait375?: string;
  heroMobilePortrait480?: string;
  heroTabletPortrait800?: string;
  heroTabletPortrait900?: string;
  heroMobileLandscape960?: string;
  heroTabletLandscape1024?: string;
  heroDesktop1280?: string;
  heroDesktop1366?: string;
  heroDesktop1440?: string;
  heroDesktop1920?: string;
  benefitIcons?: [string, string, string, string];
  footerDesktop?: string;
  footerTablet?: string;
};
