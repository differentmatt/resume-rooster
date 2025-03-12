/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Add any other configuration options here

  // Suppress specific hydration warnings caused by browser extensions
  onDemandEntries: {
    // Keep the pages in memory longer between uses
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },

  // Configure React to suppress hydration warnings for specific attributes
  compiler: {
    styledComponents: true,
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? { properties: ['^data-new-gr-c-s-check-loaded$', '^data-gr-ext-installed$'] } : false,
  }
};

module.exports = nextConfig;