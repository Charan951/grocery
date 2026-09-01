import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';

// Protect routes - JWT Verification
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this resource' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
  }
};

// Protect customer routes - verifies a customer-scoped JWT (type: 'customer',
// issued by the OTP verify flow) and loads the Customer onto req.customer.
export const protectCustomer = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized — please sign in' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'customer') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }
    const customer = await Customer.findOne({ customerId: decoded.id });
    if (!customer) {
      return res.status(401).json({ success: false, message: 'Customer account not found' });
    }
    req.customer = customer;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session is invalid or expired' });
  }
};

// Soft customer auth — attaches req.customer when a valid customer token is
// present, but never blocks the request (used on routes the web still calls
// without a token, e.g. POST /orders).
export const attachCustomerOptional = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'customer') {
      const customer = await Customer.findOne({ customerId: decoded.id });
      if (customer) req.customer = customer;
    }
  } catch (_) {
    // ignore — treat as anonymous
  }
  next();
};

// Protect delivery-partner routes — a staff JWT whose User.role === 'Delivery'
// and User.status === 'Active'. Loads the DeliveryPartner doc onto req.partner
// (auto-creates it on first authenticated access, so an admin-made User "just
// works" the first time the partner logs in).
export const protectDelivery = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized — please sign in' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'customer') {
      return res.status(403).json({ success: false, message: 'This area is for delivery partners' });
    }
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.role !== 'Delivery') {
      return res.status(403).json({ success: false, message: 'Delivery partner access required' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Contact the operations team.' });
    }
    let partner = await DeliveryPartner.findOne({ userId: user._id });
    if (!partner) {
      partner = await DeliveryPartner.create({ userId: user._id, phone: user.phone });
    }
    req.user = user;
    req.partner = partner;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session is invalid or expired' });
  }
};

// Authorize roles (RBAC)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || 'Guest'}' is not authorized to perform this action`
      });
    }
    next();
  };
};
