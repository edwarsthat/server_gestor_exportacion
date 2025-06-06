export default{
    testEnvironment: 'node',
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    collectCoverageFrom: [
        'server/**/*.js',
        'src/**/*.js',
        '!**/node_modules/**'
    ],
    // Configurar mocks para módulos específicos
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/server/$1'
    },
    // Configurar setup para pruebas
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
