import {expect} from 'chai';
import redisClient from '../utils/redis';

describe('redisClient', () => {
    it('should connect to Redis', async () => {
        await redisClient.set('testKey', 'testValue');
        const value = await redisClient.get('testKey');
        expect(value).to.equal('testValue');
    });

    it('should handle errors correctly', async () => {
        try {
            await redisClient.get(); // Invalid usage
        } catch (error) {
            expect(error).to.be.an('error');
        }
    });
});
