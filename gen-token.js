require('dotenv').config();
const jwt = require('jsonwebtoken');

// Usage: node gen-token.js <role>
// Example: node gen-token.js seller
// Example: node gen-token.js admin
// Example: node gen-token.js buyer

const role = process.argv[2] || 'buyer';

const testUsers = {
  buyer: { userId: '7ab5128e-810b-4a52-8c40-a0adc590a0c4', email: 'test@test.com' },
  seller: { userId: '58be2390-913d-4a5f-8092-b3165201c004', email: 'seller@test.com' },
  admin: { userId: '58be2390-913d-4a5f-8092-b3165201c004', email: 'admin@test.com' },
};

const selectedUser = testUsers[role];

if (!selectedUser) {
  console.log(`Unknown role "${role}". Use one of: buyer, seller, admin`);
  process.exit(1);
}

const token = jwt.sign(
  { userId: selectedUser.userId, email: selectedUser.email, role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

console.log(`Role: ${role}`);
console.log(token);