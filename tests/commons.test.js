const COMMONS = require('../modules/commons');

describe('Commons Module', () => {
    test('isObjectsValid should return true for valid objects', () => {
        expect(COMMONS.isObjectsValid('test', 123, { a: 1 })).toBe(true);
    });

    test('isObjectsValid should return false if one object is undefined', () => {
        expect(COMMONS.isObjectsValid('test', undefined, { a: 1 })).toBe(false);
    });

    test('isObjectsValid should return false if one object is null', () => {
        expect(COMMONS.isObjectsValid('test', null, { a: 1 })).toBe(false);
    });

    test('detectUserLocale should return a string', () => {
        const locale = COMMONS.detectUserLocale();
        expect(typeof locale).toBe('string');
        expect(locale.length).toBeGreaterThanOrEqual(2);
    });
});
