import express from 'express';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { protectAdmin } from './authRoutes.js';
import { protect } from './userRoutes.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// @desc    Fetch all active products (For User View)
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).select('-reviews').lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message, stack: error.stack });
  }
});

// @desc    Fetch ALL products including hidden (For Admin View)
// @route   GET /api/products/admin
// @access  Private (Admin)
router.get('/admin', protectAdmin, async (req, res) => {
  try {
    const products = await Product.find({}).select('-reviews').lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message, stack: error.stack });
  }
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      // Don't show inactive products to regular users unless they are admin
      if (!product.isActive && !req.query.admin) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Create a product (Admin only)
// @route   POST /api/products
// @access  Private (Admin)
router.post('/', protectAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { name, price, discountPercentage, description, category, brand, stock, isActive, benefits } = req.body;

    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    const product = new Product({
      name,
      price,
      discountPercentage,
      description,
      category,
      brand,
      stock,
      isActive,
      benefits: benefits ? (typeof benefits === 'string' ? JSON.parse(benefits) : benefits) : [],
      images: imageUrls
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @desc    Update a product (Admin only)
// @route   PUT /api/products/:id
// @access  Private (Admin)
router.put('/:id', protectAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { name, price, discountPercentage, description, isActive, category, brand, stock, benefits } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.price = price !== undefined ? price : product.price;
      product.discountPercentage = discountPercentage !== undefined ? discountPercentage : product.discountPercentage;
      product.description = description || product.description;
      product.isActive = isActive !== undefined ? isActive : product.isActive;
      product.category = category || product.category;
      product.brand = brand || product.brand;
      product.stock = stock !== undefined ? stock : product.stock;

      if (benefits) {
        try {
          product.benefits = typeof benefits === 'string' ? JSON.parse(benefits) : benefits;
        } catch (e) {
          console.error("Benefit parse error:", e);
          // Keep old benefits or set empty array if malformed
        }
      }


      // If new images are uploaded, add them or replace them?
      // For now, let's say it replaces the images if provided, otherwise keeps old ones.
      if (req.files && req.files.length > 0) {
        product.images = req.files.map(file => file.path);
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @desc    Delete a product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private (Admin)
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await Product.deleteOne({ _id: product._id });
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, async (req, res) => {
  const { rating, comment, name } = req.body;

  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      // Check if user has a DELIVERED order for this item
      const hasDeliveredOrder = await Order.findOne({
        user: req.user._id,
        'items.product': product._id,
        orderStatus: 'delivered'
      });

      if (!hasDeliveredOrder) {
        return res.status(400).json({ message: 'You can only review products after they have been delivered' });
      }

      if (alreadyReviewed) {
        // Update existing review
        alreadyReviewed.rating = Number(rating);
        alreadyReviewed.comment = comment;
      } else {
        // Add new review
        const review = {
          name: name || req.user.username,
          rating: Number(rating),
          comment,
          user: req.user._id,
        };
        product.reviews.push(review);
      }

      product.ratings.count = product.reviews.length;
      product.ratings.average =

        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();
      res.status(201).json({ message: 'Review added/updated successfully' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
