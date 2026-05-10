const SECURITY = require('../modules/security');
const APP_CONFIG = require('../modules/appConfig');
const SHA256 = require('crypto-js/sha256');

describe('Security Module', () => {
    beforeEach(() => {
        // Reset config before each test
        APP_CONFIG.setMainConfig({ authorization: true });
        APP_CONFIG.setUsersConfig({
            'testuser': {
                username: 'testuser',
                password: SHA256('password123').toString(),
                secret: 'testsecret',
                permissions: ['admin'],
                serversAccessRestricted: false,
                serversAllowed: []
            }
        });
    });

    test('isUserHasPermission should return true if auth is disabled', () => {
        APP_CONFIG.setMainConfig({ authorization: false });
        expect(SECURITY.isUserHasPermission('any', 'any')).toBe(true);
    });

    test('isUserHasPermission should return true for valid permission', () => {
        expect(SECURITY.isUserHasPermission('testuser', 'admin')).toBe(true);
    });

    test('isUserHasPermission should return false for invalid permission', () => {
        expect(SECURITY.isUserHasPermission('testuser', 'user')).toBe(false);
    });

    test('authorizeUser should return true for correct credentials', () => {
        expect(SECURITY.authorizeUser('testuser', 'password123')).toBe(true);
    });

    test('authorizeUser should return false for incorrect password', () => {
        expect(SECURITY.authorizeUser('testuser', 'wrongpassword')).toBe(false);
    });

    test('authenticateUser should return true for correct secret', () => {
        expect(SECURITY.authenticateUser('testuser', 'testsecret')).toBe(true);
    });
});
