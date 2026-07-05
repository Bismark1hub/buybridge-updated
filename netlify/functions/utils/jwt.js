const jwt = require('jsonwebtoken');

// Generates a signed JWT for a user. Used after signup and login so both
// functions issue tokens the exact same way — one place to change the
// expiry time or payload shape if you ever need to.
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { generateToken };