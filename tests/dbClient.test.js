import {expect} from 'chai';
import dbClient from '../utils/db';

describe('dbClient', () => {
    before(async () => {
        await dbClient.connect(); // Ensure the DB connection is established
    });

    after(async () => {
        await dbClient.disconnect(); // Clean up DB connection
    });

    it('should insert and find a user', async () => {
        const user = {email: 'test@example.com', password: 'password123'};
        const result = await dbClient.insertUserObject(user);
        expect(result).to.have.property('insertedId');

        const foundUser = await dbClient.findOneUser({email: 'test@example.com'});
        expect(foundUser).to.include(user);
    });

    it('should handle errors correctly', async () => {
        try {
            await dbClient.findOneUser({}); // Invalid query
        } catch (error) {
            expect(error).to.be.an('error');
        }
    });
});
