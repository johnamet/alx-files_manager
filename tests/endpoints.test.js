import {expect} from 'chai';
import request from 'supertest';
import app from '../app'; // Assuming your Express app is exported from app.js

describe('API Endpoints', () => {
    let token;

    before(async () => {
        // Obtain a token for testing protected routes
        const response = await request(app)
            .post('/users')
            .send({email: 'test@example.com', password: 'password123'});
        token = response.body.token;
    });

    it('GET /status', async () => {
        const response = await request(app).get('/status');
        expect(response.status).to.equal(200);
    });

    it('GET /stats', async () => {
        const response = await request(app).get('/stats');
        expect(response.status).to.equal(200);
    });

    it('POST /users', async () => {
        const response = await request(app)
            .post('/users')
            .send({email: 'newuser@example.com', password: 'newpassword123'});
        expect(response.status).to.equal(201);
    });

    it('GET /connect', async () => {
        const response = await request(app).get('/connect').set('X-Token', token);
        expect(response.status).to.equal(200);
    });

    it('GET /disconnect', async () => {
        const response = await request(app).get('/disconnect').set('X-Token', token);
        expect(response.status).to.equal(200);
    });

    it('GET /users/me', async () => {
        const response = await request(app).get('/users/me').set('X-Token', token);
        expect(response.status).to.equal(200);
    });

    it('POST /files', async () => {
        const response = await request(app)
            .post('/files')
            .set('X-Token', token)
            .send({name: 'testfile.jpg', type: 'image', data: 'base64encodeddata'});
        expect(response.status).to.equal(201);
    });

    it('GET /files/:id', async () => {
        // Assuming a valid file ID
        const fileId = 'validfileid';
        const response = await request(app).get(`/files/${fileId}`).set('X-Token', token);
        expect(response.status).to.equal(200);
    });

    it('GET /files (pagination)', async () => {
        const response = await request(app).get('/files?page=0').set('X-Token', token);
        expect(response.status).to.equal(200);
    });

    it('PUT /files/:id/publish', async () => {
        // Assuming a valid file ID
        const fileId = 'validfileid';
        const response = await request(app)
            .put(`/files/${fileId}/publish`)
            .set('X-Token', token);
        expect(response.status).to.equal(200);
    });

    it('PUT /files/:id/unpublish', async () => {
        // Assuming a valid file ID
        const fileId = 'validfileid';
        const response = await request(app)
            .put(`/files/${fileId}/unpublish`)
            .set('X-Token', token);
        expect(response.status).to.equal(200);
    });

    it('GET /files/:id/data', async () => {
        // Assuming a valid file ID
        const fileId = 'validfileid';
        const response = await request(app)
            .get(`/files/${fileId}/data`)
            .set('X-Token', token)
            .query({size: 500});
        expect(response.status).to.equal(200);
    });
});
