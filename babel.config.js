module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for react-native-reanimated (used by moti)
      'react-native-reanimated/plugin',
    ],
  };
};

