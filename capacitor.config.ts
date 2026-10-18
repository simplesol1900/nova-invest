import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.novainvest.app",
  appName: "NOVA INVEST",
  webDir: "dist",
  backgroundColor: "#0d0d0d",
  android: {
    allowMixedContent: false,
  },
};

export default config;
