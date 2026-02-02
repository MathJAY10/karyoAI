module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react'],
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    rules: {
        'no-unused-vars': 'off', // Disable base rule
        '@typescript-eslint/no-unused-vars': ['warn', {
            argsIgnorePattern: '^_'
        }],
        'react/react-in-jsx-scope': 'off', // Not needed for React 17+
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
};
