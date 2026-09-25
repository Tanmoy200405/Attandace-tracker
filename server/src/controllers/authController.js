import jwt from "jsonwebtoken";
import Owner from "../models/Owner.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "biotrack_super_secret_jwt_key_2026";

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Register a new business owner
// @route   POST /api/auth/register
export const registerOwner = async (req, res) => {
  try {
    const { name, email, password, businessName, shiftStart, shiftEnd } =
      req.body;

    const existingOwner = await Owner.findOne({ email });
    if (existingOwner) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const owner = await Owner.create({
      name,
      email,
      password,
      businessName: businessName || "My Business Enterprise",
      shiftStart: shiftStart || "09:00",
      shiftEnd: shiftEnd || "17:00",
    });

    res.status(201).json({
      success: true,
      data: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        businessName: owner.businessName,
        language: owner.language,
        organizationLogo: owner.organizationLogo,
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
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    res.json({
      success: true,
      data: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        businessName: owner.businessName,
        language: owner.language,
        organizationLogo: owner.organizationLogo,
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
      return res
        .status(404)
        .json({ success: false, message: "Owner not found" });
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
    const {
      businessName,
      shiftStart,
      shiftEnd,
      gracePeriodMinutes,
      workingDays,
      kioskPassword,
      language,
      organizationLogo,
      deviceConfig,
    } = req.body;

    let owner = await Owner.findById(req.owner?._id || req.owner?.id).select(
      "+kioskPassword",
    );
    if (!owner) {
      return res
        .status(404)
        .json({ success: false, message: "Owner profile not found" });
    }

    if (businessName !== undefined) owner.businessName = businessName;
    if (shiftStart !== undefined) owner.shiftStart = shiftStart;
    if (shiftEnd !== undefined) owner.shiftEnd = shiftEnd;
    if (gracePeriodMinutes !== undefined)
      owner.gracePeriodMinutes = Number(gracePeriodMinutes);
    if (workingDays !== undefined) owner.workingDays = workingDays;
    if (language !== undefined) owner.language = language;
    if (organizationLogo !== undefined)
      owner.organizationLogo = organizationLogo;
    if (deviceConfig !== undefined) {
      if (deviceConfig.kioskMode !== undefined) owner.deviceConfig.kioskMode = deviceConfig.kioskMode;
      if (deviceConfig.deviceType !== undefined) owner.deviceConfig.deviceType = deviceConfig.deviceType;
      if (deviceConfig.voiceAssist !== undefined) owner.deviceConfig.voiceAssist = deviceConfig.voiceAssist;
      if (deviceConfig.autoCountdownSeconds !== undefined) owner.deviceConfig.autoCountdownSeconds = deviceConfig.autoCountdownSeconds;
      owner.markModified('deviceConfig');
    }
    if (kioskPassword !== undefined) {
      if (kioskPassword && String(kioskPassword).length < 4) {
        return res.status(400).json({
          success: false,
          message: "Kiosk password must be at least 4 characters",
        });
      }
      owner.kioskPassword = kioskPassword;
    }

    await owner.save();

    const publicOwner = owner.toObject();
    delete publicOwner.password;
    delete publicOwner.kioskPassword;

    res.json({
      success: true,
      message: "Business settings updated successfully",
      data: publicOwner,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify the kiosk password without exposing its hash
// @route   POST /api/auth/verify-kiosk-password
export const verifyKioskPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const owner = await Owner.findById(req.owner?._id || req.owner?.id).select(
      "+kioskPassword",
    );
    if (!owner || !(await owner.matchKioskPassword(password || ""))) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect kiosk password" });
    }
    res.json({ success: true, message: "Kiosk password verified" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check whether kiosk password setup has been completed
// @route   GET /api/auth/kiosk-status
export const getKioskStatus = async (req, res) => {
  try {
    const owner = await Owner.findById(req.owner?._id || req.owner?.id).select(
      "+kioskPassword",
    );
    res.json({ success: true, configured: Boolean(owner?.kioskPassword) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change the owner login password
// @route   PUT /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const owner = await Owner.findById(req.owner?._id || req.owner?.id);
    if (!owner || !(await owner.matchPassword(currentPassword || ""))) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }
    owner.password = newPassword;
    await owner.save();
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
