export type FeatureFlag =
  | "native_camera"
  | "biometric_login"
  | "share_comprovante";

export interface FeatureFlagContext {
  platform: "web" | "native";
  env: string;
}

export interface FeatureFlagProvider {
  isEnabled(flag: FeatureFlag, ctx?: FeatureFlagContext): boolean;
}

const defaults: Record<FeatureFlag, boolean> = {
  native_camera: false,
  biometric_login: false,
  share_comprovante: false,
};

class StaticFeatureFlagProvider implements FeatureFlagProvider {
  isEnabled(flag: FeatureFlag, _ctx?: FeatureFlagContext): boolean {
    return defaults[flag] ?? false;
  }
}

let provider: FeatureFlagProvider = new StaticFeatureFlagProvider();

export function setFeatureFlagProvider(p: FeatureFlagProvider) {
  provider = p;
}

export function isFeatureEnabled(flag: FeatureFlag, ctx?: FeatureFlagContext): boolean {
  return provider.isEnabled(flag, ctx);
}
