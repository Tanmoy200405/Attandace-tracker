import jwt from 'jsonwebtoken';
import Owner from '../models/Owner.js';

const JWT_SECRET = process.env.JWT_SECRET || 'biotrack_super_secret_jwt_key_2026';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // If running in open/demo mode, find or create default owner
    try {
      const defaultOwner = await Owner.findOne();
      if (defaultOwner) {
        req.owner = defaultOwner;
        return next();
      }
    } catch (e) {
      // Continue to unauthorized
    }
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.owner = await Owner.findById(decoded.id).select('-password');
    if (!req.owner) {
      return res.status(401).json({ success: false, message: 'Owner not found' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
  }
};
