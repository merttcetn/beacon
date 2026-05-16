module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    FAL_KEY: process.env.FAL_KEY ?? '',
  },
});
