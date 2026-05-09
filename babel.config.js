module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // react-native-worklets must be listed last
    // (replaces react-native-reanimated/plugin in Reanimated 4.x)
    'react-native-worklets/plugin',
  ],
};
