module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/fixtures/',
    '/tests/utils/'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/fixtures/',
    '/tests/utils/'
  ],
  setupFilesAfterEnv: ['./tests/setup.js']
};
