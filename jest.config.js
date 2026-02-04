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
        '^@/(.*)$': '<rootDir>/server/$1',
        '^pdfkit$': '<rootDir>/__mocks__/pdfkit.js'
    },
    // Configurar setup para pruebas
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
