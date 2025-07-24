const { getConnection, sql } = require('../db/connection');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    // Default role to 'Employee' if not provided
    const userRole = role || 'Employee';
    const pool = await getConnection();
    const passwordHash = await hashPassword(password);
    await pool.request()
      .input('username', sql.VarChar(50), username)
      .input('email', sql.VarChar(100), email)
      .input('password_hash', sql.VarChar(255), passwordHash)
      .input('role', sql.VarChar(20), userRole)
      .execute('sp_RegisterUser');
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error.number === 2627) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', username, password);
    if (!username || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' });
    }
    const pool = await getConnection();
    // Fetch user by username or email
    const result = await pool.request()
      .input('username', sql.VarChar(50), username)
      .input('email', sql.VarChar(100), username)
      .query(`SELECT * FROM Users WHERE username = @username OR email = @email`);
    console.log('User from DB:', result.recordset[0]);
    if (result.recordset.length === 0) {
      console.log('No user found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = result.recordset[0];
    console.log('Stored hash:', user.password_hash);
    const isMatch = await comparePassword(password, user.password_hash);
    console.log('Password match:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login
}; 