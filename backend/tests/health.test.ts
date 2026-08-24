import request from 'supertest';
import app from '../src/app';

describe('Health API', () => {
  it('GET /api/v1/health should return success', async () => {
    const res = await request(app).get('/api/v1/health');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('API is running');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('POST /api/v1/health/echo should fail validation if message is missing', async () => {
    const res = await request(app).post('/api/v1/health/echo').send({});
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/health/echo should return echoed message on valid input', async () => {
    const res = await request(app)
      .post('/api/v1/health/echo')
      .send({ message: 'Hello AI' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.echoedMessage).toBe('Hello AI');
  });

  it('GET /api/v1/unknown should return 404', async () => {
    const res = await request(app).get('/api/v1/unknown-route');
    
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
