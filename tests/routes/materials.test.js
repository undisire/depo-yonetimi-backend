const request = require('supertest');
const app = require('../../app');
const {
  createTestUser,
  createTestMaterial,
  createTestData
} = require('../utils/testHelpers');

describe('Materials Routes', () => {
  let testData;

  beforeEach(async () => {
    testData = await createTestData();
  });

  describe('GET /api/materials', () => {
    it('should return all materials for authenticated user', async () => {
      const response = await request(app)
        .get('/api/materials')
        .set('Authorization', `Bearer ${testData.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBeTruthy();
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/materials');

      expect(response.status).toBe(401);
    });

    it('should support pagination', async () => {
      // Create 15 test materials
      for (let i = 0; i < 15; i++) {
        await createTestMaterial();
      }

      const response = await request(app)
        .get('/api/materials?page=2&limit=10')
        .set('Authorization', `Bearer ${testData.token}`);

      expect(response.status).toBe(200);
      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.limit).toBe(10);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should support searching', async () => {
      const searchMaterial = await createTestMaterial();
      const uniqueCode = 'UNIQUE123';
      await searchMaterial.update({ material_code: uniqueCode });

      const response = await request(app)
        .get(`/api/materials?search=${uniqueCode}`)
        .set('Authorization', `Bearer ${testData.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.some(m => m.material_code === uniqueCode)).toBeTruthy();
    });
  });

  describe('GET /api/materials/:id', () => {
    it('should return material by id', async () => {
      const response = await request(app)
        .get(`/api/materials/${testData.material.id}`)
        .set('Authorization', `Bearer ${testData.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testData.material.id);
    });

    it('should return 404 for non-existent material', async () => {
      const response = await request(app)
        .get('/api/materials/99999')
        .set('Authorization', `Bearer ${testData.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/materials', () => {
    it('should create new material for admin user', async () => {
      const { token } = await createTestUser('admin');
      const newMaterial = {
        material_code: 'TEST001',
        description: 'Test Material',
        unit: 'adet',
        stock_qty: 100
      };

      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${token}`)
        .send(newMaterial);

      expect(response.status).toBe(201);
      expect(response.body.data.material_code).toBe(newMaterial.material_code);
    });

    it('should return 403 for non-admin user', async () => {
      const newMaterial = {
        material_code: 'TEST001',
        description: 'Test Material',
        unit: 'adet',
        stock_qty: 100
      };

      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${testData.token}`)
        .send(newMaterial);

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const { token } = await createTestUser('admin');
      const invalidMaterial = {
        description: 'Test Material'
      };

      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidMaterial);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/materials/:id', () => {
    it('should update material for admin user', async () => {
      const { token } = await createTestUser('admin');
      const updates = {
        description: 'Updated Description',
        stock_qty: 200
      };

      const response = await request(app)
        .put(`/api/materials/${testData.material.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe(updates.description);
      expect(response.body.data.stock_qty).toBe(updates.stock_qty);
    });

    it('should return 403 for non-admin user', async () => {
      const updates = {
        description: 'Updated Description'
      };

      const response = await request(app)
        .put(`/api/materials/${testData.material.id}`)
        .set('Authorization', `Bearer ${testData.token}`)
        .send(updates);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/materials/:id', () => {
    it('should delete material for admin user', async () => {
      const { token } = await createTestUser('admin');

      const response = await request(app)
        .delete(`/api/materials/${testData.material.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/materials/${testData.material.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .delete(`/api/materials/${testData.material.id}`)
        .set('Authorization', `Bearer ${testData.token}`);

      expect(response.status).toBe(403);
    });
  });
});
