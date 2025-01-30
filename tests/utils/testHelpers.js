const jwt = require('jsonwebtoken');
const faker = require('faker');
const User = require('../../models/User');
const Material = require('../../models/Material');
const Request = require('../../models/Request');
const Project = require('../../models/Project');

// Test kullanıcısı oluştur
const createTestUser = async (role = 'muhendis') => {
  const user = await User.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: 'Test123!',
    role: role
  });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return { user, token };
};

// Test malzemesi oluştur
const createTestMaterial = async () => {
  return await Material.create({
    material_code: faker.random.alphaNumeric(8),
    description: faker.commerce.productDescription(),
    unit: faker.random.arrayElement(['adet', 'kg', 'metre']),
    stock_qty: faker.datatype.number({ min: 0, max: 1000 })
  });
};

// Test projesi oluştur
const createTestProject = async () => {
  return await Project.create({
    project_name: faker.company.companyName(),
    pyp_number: faker.random.alphaNumeric(10),
    start_date: faker.date.past(),
    end_date: faker.date.future(),
    status: faker.random.arrayElement(['active', 'completed', 'cancelled'])
  });
};

// Test talebi oluştur
const createTestRequest = async (userId, materialId, projectId) => {
  return await Request.create({
    user_id: userId,
    material_id: materialId,
    project_id: projectId,
    requested_qty: faker.datatype.number({ min: 1, max: 100 }),
    status: faker.random.arrayElement(['pending', 'approved', 'rejected', 'completed'])
  });
};

// Test verileri oluştur
const createTestData = async () => {
  const { user, token } = await createTestUser();
  const material = await createTestMaterial();
  const project = await createTestProject();
  const request = await createTestRequest(user.id, material.id, project.id);

  return {
    user,
    token,
    material,
    project,
    request
  };
};

module.exports = {
  createTestUser,
  createTestMaterial,
  createTestProject,
  createTestRequest,
  createTestData
};
