module.exports = {
  preset: 'jest-expo',
  resolver: 'react-native-reanimated/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lucide-react-native$': '<rootDir>/tests/mocks/lucide-react-native.tsx',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|react-navigation|@react-navigation/.*|nativewind|react-native-css-interop|lucide-react-native|react-native-svg)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**'],
};
