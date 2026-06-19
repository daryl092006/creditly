const jwt = require('jsonwebtoken');

// Customize the secret and payload as needed
const SECRET_KEY = process.env.JWT_SECRET || 'my-super-secret-key-12345';
const payload = {
    sub: '1234567890',
    name: 'User',
    admin: true
};

const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '30m' });

console.log('--------------------------------------------------');
console.log('JWT Secret used:', SECRET_KEY);
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('Expires in: 30 minutes');
console.log('--------------------------------------------------');
console.log('Token:');
console.log(token);
console.log('--------------------------------------------------');
