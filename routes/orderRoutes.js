import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protectAdmin } from './authRoutes.js';
import { protect } from './userRoutes.js';
import sendOrderEmail from '../config/mail.js';



const router = express.Router();



// @desc    Create new order & Send Email
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  const { items, totalAmount, shippingAddress, paymentStatus } = req.body;

  if (items && items.length === 0) {
    return res.status(400).json({ message: 'No order items' });
  }

  try {
    // ── QUEUE-BASED ATOMIC STOCK VALIDATION & DEDUCTION ──
    const deducted = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, soldCount: item.quantity } },
        { new: true }
      );

      if (!product) {
        // Restore stock and soldCount for all previously deducted items
        for (const d of deducted) {
          await Product.findByIdAndUpdate(d.product, { $inc: { stock: d.quantity, soldCount: -d.quantity } });
        }
        const p = await Product.findById(item.product);
        const available = p ? p.stock : 0;
        return res.status(400).json({
          message: `Sorry! Only ${available} unit(s) of "${item.name}" left in stock. Please update your cart.`,
          productId: item.product,
          availableStock: available
        });
      }

      // Verify and fix price from DB
      const dbPrice = product.price * (1 - (product.discountPercentage || 0) / 100);
      item.price = dbPrice; // Update item price to DB price
      calculatedTotal += dbPrice * item.quantity;

      deducted.push({ product: item.product, quantity: item.quantity });
    }

    // All stock validated and deducted — create the order
    const order = new Order({
      user: req.user._id,
      items,
      totalAmount: calculatedTotal, // Use calculated total instead of frontend total
      shippingAddress,
      paymentStatus: paymentStatus || 'pending',
      razorpayOrderId: req.body.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature
    });

    const createdOrder = await order.save();

    // ── BROADCAST REAL-TIME WEBSOCKET EVENTS ──
    if (req.io) {
      req.io.emit('order_created', {
        orderId: createdOrder._id,
        totalAmount: createdOrder.totalAmount,
        user: req.user.username
      });
      req.io.emit('stock_updated', {
        deducted
      });
    }

    // ── SEND NOTIFICATIONS (Async, don't block the response) ──
    sendOrderEmail(createdOrder, req.user, 'customer');
    sendOrderEmail(createdOrder, req.user, 'admin');

    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: 'Order creation failed', error: error.message });
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders/admin
// @access  Private (Admin)
router.get('/admin', protectAdmin, async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;

  try {
    const count = await Order.countDocuments({});
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ orders, page, pages: Math.ceil(count / pageSize), total: count });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (Admin)
router.get('/:id', protectAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Update order status (with stock restore on cancel / re-deduct on uncancel)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
router.put('/:id/status', protectAdmin, async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const previousStatus = order.orderStatus;
    const newStatus = orderStatus || order.orderStatus;

    // ── STOCK RESTORATION ON CANCELLATION ──
    if (newStatus === 'cancelled' && previousStatus !== 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity, soldCount: -item.quantity } }
        );
      }
    }

    // ── STOCK RE-DEDUCTION IF ADMIN REVERTS CANCELLATION ──
    if (previousStatus === 'cancelled' && newStatus !== 'cancelled') {
      const reDeducted = [];
      for (const item of order.items) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity, soldCount: item.quantity } },
          { new: true }
        );
        if (!updated) {
          // Rollback re-deductions already done
          for (const d of reDeducted) {
            await Product.findByIdAndUpdate(d.product, { $inc: { stock: d.quantity, soldCount: -d.quantity } });
          }
          const product = await Product.findById(item.product);
          return res.status(400).json({
            message: `Cannot reactivate: only ${product?.stock || 0} unit(s) of "${item.name}" available. Check inventory first.`
          });
        }
        reDeducted.push({ product: item.product, quantity: item.quantity });
      }
    }

    order.orderStatus = newStatus;
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
