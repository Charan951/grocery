import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'charan12',
  api_key: process.env.CLOUDINARY_API_KEY || '478681192216688',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'du1JrEvTmjfmDiDa-Yi9cfP4MWc',
  secure: true,
});

/**
 * Upload base64 image or file stream to Cloudinary
 * @param {string} fileInput - Base64 data URI or file path / URL
 * @param {string} folder - Destination folder on Cloudinary (e.g. 'freshcart/products')
 */
export const uploadToCloudinary = async (fileInput, folder = 'freshcart') => {
  try {
    const result = await cloudinary.uploader.upload(fileInput, {
      folder,
      resource_type: 'auto',
    });
    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(error.message || 'Cloudinary upload failed');
  }
};

export default cloudinary;
