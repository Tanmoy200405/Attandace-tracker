import jwt from 'jsonwebtoken';
import Owner from '../models/Owner.js';

const JWT_SECRET = process.env.JWT_SECRET || 'biotrack_super_secret_jwt_key_2026';

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new business owner
// @route   POST /api/auth/register
export const registerOwner = async (req, res) => {
  try {
    const { name, email, password, businessName, shiftStart, shiftEnd } = req.body;

    const existingOwner = await Owner.findOne({ email });
    if (existingOwner) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const owner = await Owner.create({
      name,
      email,
      password,
      businessName: businessName || 'My Business Enterprise',
      shiftStart: shiftStart || '09:00',
      shiftEnd: shiftEnd || '17:00',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        businessName: owner.businessName,
        shiftStart: owner.shiftStart,
        shiftEnd: owner.shiftEnd,
        gracePeriodMinutes: owner.gracePeriodMinutes,
        token: generateToken(owner._id),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Owner login
// @route   POST /api/auth/login
export const loginOwner = async (req, res) => {
  try {
    const { email, password } = req.body;

    const owner = await Owner.findOne({ email });
    if (!owner || !(await owner.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      data: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        businessName: owner.businessName,
        shiftStart: owner.shiftStart,
        shiftEnd: owner.shiftEnd,
        gracePeriodMinutes: owner.gracePeriodMinutes,
        token: generateToken(owner._id),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current owner profile & business settings
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    let owner = req.owner;
    if (!owner) {
      owner = await Owner.findOne();
    }
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    res.json({
      success: true,
      data: owner,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update business settings
// @route   PUT /api/auth/settings
export const updateSettings = async (req, res) => {
  try {
    const { businessName, shiftStart, shiftEnd, gracePeriodMinutes, workingDays } = req.body;

    let owner = req.owner;
    if (!owner) {
      owner = await Owner.findOne();
    }
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner profile not found' });
    }

    if (businessName !== undefined) owner.businessName = businessName;
    if (shiftStart !== undefined) owner.shiftStart = shiftStart;
    if (shiftEnd !== undefined) owner.shiftEnd = shiftEnd;
    if (gracePeriodMinutes !== undefined) owner.gracePeriodMinutes = Number(gracePeriodMinutes);
    if (workingDays !== undefined) owner.workingDays = workingDays;

    await owner.save();

    res.json({
      success: true,
      message: 'Business settings updated successfully',
      data: owner,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
