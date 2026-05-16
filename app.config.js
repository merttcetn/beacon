module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), 'expo-audio'],
  extra: {
    ...config.extra,
    FAL_KEY: process.env.FAL_KEY ?? '',
  },
});
