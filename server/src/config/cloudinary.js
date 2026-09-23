import { v2 as cloudinary } from 'cloudinary';

const getCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
};

/**
 * Uploads a base64 string or data URL to Cloudinary
 * @param {string} base64Str - Base64 image string or data URL
 * @param {string} folder - Folder name in Cloudinary (e.g. 'staff_faces' or 'attendance_snapshots')
 * @returns {Promise<string>} Cloudinary secure HTTPS URL or original string if not base64
 */
export const uploadBase64ToCloudinary = async (base64Str, folder = 'attendance_app') => {
  if (!base64Str || typeof base64Str !== 'string') {
    return '';
  }

  // If already an HTTP/HTTPS URL, return it directly
  if (base64Str.startsWith('http://') || base64Str.startsWith('https://')) {
    return base64Str;
  }

  // Ensure base64 string format for data URL
  let formattedData = base64Str;
  if (!base64Str.startsWith('data:image')) {
    formattedData = `data:image/jpeg;base64,${base64Str}`;
  }

  try {
    const cloud = getCloudinary();
    const uploadResponse = await cloud.uploader.upload(formattedData, {
      folder: `biotrack/${folder}`,
      resource_type: 'image',
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

export default cloudinary;
