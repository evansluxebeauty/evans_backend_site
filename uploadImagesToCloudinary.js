import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import Product from './models/Product.js';
import path from 'path';
import fs from 'fs';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const uploadImages = async () => {
  await connectDB();
  const products = await Product.find({});
  console.log(`Found ${products.length} products`);

  const FOLDER_NAME = 'products_images';
  const localImagesDir = path.join(process.cwd(), '..', 'frontend', 'public', 'images');
  const availableLocalFiles = fs.existsSync(localImagesDir) ? fs.readdirSync(localImagesDir) : [];

  for (const product of products) {
    if (product.images && product.images.length > 0) {
      const updatedImages = [];

      for (let i = 0; i < product.images.length; i++) {
        const imagePath = product.images[i];
        console.log(`Processing image for ${product.name}: ${imagePath}`);

        try {
          let uploadSource = imagePath;

          if (imagePath.startsWith('/images/')) {
            const fullLocalPath = path.join(process.cwd(), '..', 'frontend', 'public', imagePath);
            if (fs.existsSync(fullLocalPath)) {
              uploadSource = fullLocalPath;
            }
          } else {
            // Extract base filename without extension
            const urlBasename = path.basename(imagePath).split('.')[0];
            // Find matching local file in frontend/public/images
            const match = availableLocalFiles.find(f => f.split('.')[0] === urlBasename);
            if (match) {
              const fullMatchPath = path.join(localImagesDir, match);
              console.log(`Matched remote URL to local file: ${fullMatchPath}`);
              uploadSource = fullMatchPath;
            }
          }

          console.log(`Uploading to Cloudinary folder "${FOLDER_NAME}" ...`);
          const result = await cloudinary.uploader.upload(uploadSource, {
            folder: FOLDER_NAME,
            use_filename: true,
            unique_filename: false,
          });

          console.log(`Uploaded to Cloudinary: ${result.secure_url}`);
          updatedImages.push(result.secure_url);
        } catch (err) {
          console.error(`Failed to upload ${imagePath} for product ${product.name}: ${err.message}`);
          updatedImages.push(imagePath); // keep original if upload failed
        }
      }

      product.images = updatedImages;
      await product.save();
      console.log(`Updated product: ${product.name}`);
    }
  }

  console.log('Finished uploading all product images to Cloudinary folder "products_images" and updating MongoDB.');
  process.exit(0);
};

uploadImages();
