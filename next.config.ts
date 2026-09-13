import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/adapter-pg"],
  experimental: {
    // Site photos travel through the server action that saves them: a cover
    // plus a full gallery at 4 MB each, with room for multipart overhead.
    serverActions: { bodySizeLimit: "28mb" },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
