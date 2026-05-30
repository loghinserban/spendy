const request = require('supertest');
const app = require('../src/server').default;

(async ()=>{
  const res = await request(app).post('/register').send({ username: 'dbguser', email: 'dbg@example.com', password: 'Password123!' });
  console.log('status', res.status);
  console.log('body', res.body);
  process.exit(0);
})();

