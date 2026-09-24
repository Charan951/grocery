import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { User } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import {
  returnConfig, eligibilityFor, createReturn, acceptReturnOffer, rejectReturnOffer,
  manualAssignReturn, requeueReturn, cancelReturn, rejectReturn, partnerArrived, partnerCollect,
  partnerFail, partnerComplete, processRefund, customerView, partnerView,
} from '../services/returnService.js';
import { logAudit } from './_shared.js';

const fail = (res, [status, message], code) => res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

// Same ownership model as cancel / rate / tip: a customer token when present,
// else the signed-in web customer's phone in the body (POST) or query (GET).
const resolveCustomer = async (req) => {
  if (req.customer) return req.customer;
  const raw = String(req.body?.phone || req.query?.phone || '').replace(/\D/g, '').slice(-10);
  return raw ? Customer.findOne({ phone: new RegExp(raw + '$') }) : null;
};

const owns = (cust, doc) => {
  const phone10 = String(cust.phone || '').replace(/\D/g, '').slice(-10);
  return doc.customerId === cust.customerId || (!!phone10 && String(doc.customerPhone || '').endsWith(phone10));
};

const loadOwnedOrder = async (req) => {
  const order = await Order.findOne({ orderId: req.params.id });
  if (!order) return { err: [404, 'Order not found'] };
  const cust = await resolveCustomer(req);
  if (!cust) return { err: [401, 'Sign in to manage returns'] };
  if (!owns(cust, order)) return { err: [403, 'Not your order'] };
  return { order, cust };
};

const loadOwnedReturn = async (req) => {
  const rr = await ReturnRequest.findOne({ returnId: req.params.id });
  if (!rr) return { err: [404, 'Return request not found'] };
  const cust = await resolveCustomer(req);
  if (!cust) return { err: [401, 'Sign in to manage returns'] };
  if (!owns(cust, rr)) return { err: [403, 'Not your return request'] };
  return { rr, cust };
};

const loadPartnerReturn = async (req) => {
  const rr = await ReturnRequest.findOne({ returnId: req.params.id });
  if (!rr) return { err: [404, 'Return request not found'] };
  if (String(rr.partnerUserId || '') !== String(req.user._id)) return { err: [403, 'This pickup is not assigned to you'] };
  return { rr };
};

const wrap = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const returnController = {
  // ---------------- Customer ----------------

  // GET /api/returns/config — issue list + window, shared by web and app.
  getConfig: wrap(async (req, res) => {
    res.json({ success: true, config: await returnConfig() });
  }),

  // GET /api/orders/:id/returns — eligibility + existing requests for this order.
  getOrderReturns: wrap(async (req, res) => {
    const { order, err } = await loadOwnedOrder(req);
    if (err) return fail(res, err);
    res.json({ success: true, ...(await eligibilityFor(order)) });
  }),

  // POST /api/orders/:id/returns  { type, items, reasonCode, comment, photos, refundMethod }
  createReturn: wrap(async (req, res) => {
    const { order, cust, err } = await loadOwnedOrder(req);
    if (err) return fail(res, err);
    const r = await createReturn({ order, customer: cust, body: req.body || {} });
    if (r.error) return fail(res, r.error);
    res.status(201).json({ success: true, returnRequest: customerView(r.rr) });
  }),

  // GET /api/returns/mine — every request for the signed-in customer.
  listMine: wrap(async (req, res) => {
    const cust = await resolveCustomer(req);
    if (!cust) return fail(res, [401, 'Sign in to see your returns']);
    const phone10 = String(cust.phone || '').replace(/\D/g, '').slice(-10);
    const list = await ReturnRequest.find({
      $or: [{ customerId: cust.customerId }, ...(phone10 ? [{ customerPhone: new RegExp(phone10 + '$') }] : [])],
    }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, returns: list.map(customerView) });
  }),

  // GET /api/returns/:id
  getMine: wrap(async (req, res) => {
    const { rr, err } = await loadOwnedReturn(req);
    if (err) return fail(res, err);
    res.json({ success: true, returnRequest: customerView(rr) });
  }),

  // POST /api/returns/:id/cancel
  cancelMine: wrap(async (req, res) => {
    const { rr, err } = await loadOwnedReturn(req);
    if (err) return fail(res, err);
    const r = await cancelReturn(rr, 'Cancelled by customer');
    if (r.error) return fail(res, r.error);
    res.json({ success: true, returnRequest: customerView(r.rr) });
  }),

  // ---------------- Delivery partner ----------------

  // GET /api/delivery/returns/offers — live pickup offers for this partner.
  partnerOffers: wrap(async (req, res) => {
    const now = new Date();
    const list = await ReturnRequest.find({
      status: 'Requested',
      offers: { $elemMatch: { partnerUserId: req.user._id, status: 'offered', expiresAt: { $gt: now } } },
    });
    const offers = list.map((rr) => {
      const o = rr.offers.find((x) => String(x.partnerUserId) === String(req.user._id) && x.status === 'offered');
      return {
        kind: 'return', returnId: rr.returnId, offerId: String(o._id), orderId: rr.orderId, type: rr.type,
        attempt: o.attempt, expiresAt: o.expiresAt, distanceMeters: o.distanceMeters,
        itemCount: rr.items.reduce((s, i) => s + i.quantity, 0),
        items: rr.items.map((i) => ({ name: i.name, quantity: i.quantity })),
        reason: rr.reasonLabel, pickupAddress: rr.pickupAddress, pickup: rr.pickupLocation || null, store: rr.store || null,
      };
    });
    res.json({ success: true, offers });
  }),

  // GET /api/delivery/returns/active — pickups this partner is working on.
  partnerActive: wrap(async (req, res) => {
    const list = await ReturnRequest.find({
      partnerUserId: req.user._id, status: { $in: ['Assigned', 'Arrived', 'Picked Up'] },
    }).sort({ updatedAt: -1 });
    res.json({ success: true, returns: list.map(partnerView) });
  }),

  // GET /api/delivery/returns/history
  partnerHistory: wrap(async (req, res) => {
    const list = await ReturnRequest.find({
      partnerUserId: req.user._id, status: { $in: ['Completed', 'Rejected', 'Pickup Failed'] },
    }).sort({ updatedAt: -1 }).limit(50);
    res.json({ success: true, returns: list.map(partnerView) });
  }),

  partnerGet: wrap(async (req, res) => {
    const { rr, err } = await loadPartnerReturn(req);
    if (err) return fail(res, err);
    res.json({ success: true, returnRequest: partnerView(rr) });
  }),

  partnerAccept: wrap(async (req, res) => {
    const r = await acceptReturnOffer({ returnId: req.params.id, user: req.user });
    if (!r.ok) return res.status(409).json({ success: false, code: r.code, message: r.message });
    res.json({ success: true, returnRequest: partnerView(r.rr) });
  }),

  partnerReject: wrap(async (req, res) => {
    const r = await rejectReturnOffer({ returnId: req.params.id, user: req.user, reason: req.body?.reason });
    if (!r.ok) return res.status(409).json({ success: false, code: r.code, message: 'Offer no longer available' });
    res.json({ success: true });
  }),

  partnerArrived: wrap(async (req, res) => {
    const { rr, err } = await loadPartnerReturn(req);
    if (err) return fail(res, err);
    const r = await partnerArrived(rr);
    if (r.error) return fail(res, r.error);
    res.json({ success: true, returnRequest: partnerView(r.rr) });
  }),

  // POST /api/delivery/returns/:id/collect  { otp, photos[], itemsVerified, note }
  partnerCollect: wrap(async (req, res) => {
    const { rr, err } = await loadPartnerReturn(req);
    if (err) return fail(res, err);
    const r = await partnerCollect(rr, req.body || {});
    if (r.error) return fail(res, r.error, r.code);
    res.json({ success: true, returnRequest: partnerView(r.rr) });
  }),

  // POST /api/delivery/returns/:id/refuse  { reason } — item doesn't match / not returnable
  partnerRefuse: wrap(async (req, res) => {
    const { rr, err } = await loadPartnerReturn(req);
    if (err) return fail(res, err);
    const reason = String(req.body?.reason || '').trim().slice(0, 300);
    if (!reason) return fail(res, [400, 'A reason is required']);
    if (!['Assigned', 'Arrived'].includes(rr.status)) return fail(res, [409, `Cannot refuse from "${rr.status}"`]);
    const r = await rejectReturn(rr, `Refused at pickup: ${reason}`, null);
    if (r.error) return fail(res, r.error);
    res.json({ success: true, returnRequest: partnerView(r.rr) });
  }),

  // POST /api/delivery/returns/:id/fail  { reason } — couldn't reach the customer, etc.
  partnerFail: wrap(async (req, res) => {
    const { rr, err } = await loadPartnerReturn(req);
    if (err) return fail(res, err);
    const reason = String(req.body?.reason || '').trim().slice(0, 300);
    if (!reason) return fail(res, [400, 'A reason is required']);
    const r = await partnerFail(rr, reason);
    if (r.error) return fail(res, r.error);
    res.json({ success: true, returnRequest: partnerView(r.rr) });
  }),

  // POST /api/delivery/returns/:id/complete — dropped at the store.
  partnerComplete: wrap(async (req, res) => {
    const { rr, err } = await loadPartnerReturn(req);
    if (err) return fail(res, err);
    const r = await partnerComplete(rr);
    if (r.error) return fail(res, r.error);
    res.json({ success: true, returnRequest: partnerView(r.rr) });
  }),

  // ---------------- Admin ----------------

  // GET /api/admin/returns?status=&type=&q=
  adminList: wrap(async (req, res) => {
    const filter = {};
    if (req.query.status && req.query.status !== 'All') filter.status = String(req.query.status);
    if (['return', 'exchange'].includes(req.query.type)) filter.type = req.query.type;
    const q = String(req.query.q || '').trim();
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ returnId: rx }, { orderId: rx }, { customerName: rx }, { customerPhone: rx }];
    }
    const list = await ReturnRequest.find(filter).select('-photos -proofPhotos').sort({ createdAt: -1 }).limit(300).lean();
    const counts = await ReturnRequest.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    const refundsDue = await ReturnRequest.countDocuments({ 'refund.status': { $in: ['scheduled', 'failed'] } });
    res.json({
      success: true,
      returns: list.map((r) => ({
        ...r,
        liveOffers: (r.offers || []).filter((o) => o.status === 'offered').length,
        offers: undefined,
      })),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
      refundsDue,
    });
  }),

  adminGet: wrap(async (req, res) => {
    const rr = await ReturnRequest.findOne({ returnId: req.params.id }).lean();
    if (!rr) return fail(res, [404, 'Return request not found']);
    const order = await Order.findOne({ orderId: rr.orderId })
      .select('orderId totalAmount paymentMethod paymentStatus deliveredAt deliveryPartnerName createdAt').lean();
    res.json({ success: true, returnRequest: rr, order });
  }),

  // POST /api/admin/returns/:id/assign  { partnerUserId }
  adminAssign: wrap(async (req, res) => {
    const rr = await ReturnRequest.findOne({ returnId: req.params.id });
    if (!rr) return fail(res, [404, 'Return request not found']);
    const partnerUser = await User.findOne({ _id: req.body.partnerUserId, role: 'Delivery', status: 'Active' });
    if (!partnerUser) return fail(res, [400, 'Invalid / inactive delivery partner']);
    if (!(await DeliveryPartner.findOne({ userId: partnerUser._id }))) {
      await DeliveryPartner.create({ userId: partnerUser._id, phone: partnerUser.phone });
    }
    const r = await manualAssignReturn({ rr, partnerUser, by: req.user.name });
    if (r.error) return fail(res, r.error);
    await logAudit(String(req.user._id), req.user.name, 'Return Pickup Assigned', `${rr.returnId} → ${partnerUser.name}`);
    res.json({ success: true, returnRequest: r.rr });
  }),

  adminRequeue: wrap(async (req, res) => {
    const rr = await ReturnRequest.findOne({ returnId: req.params.id });
    if (!rr) return fail(res, [404, 'Return request not found']);
    const r = await requeueReturn(rr, req.user.name);
    if (r.error) return fail(res, r.error);
    res.json({ success: true, returnRequest: r.rr, dispatch: r.dispatch });
  }),

  // POST /api/admin/returns/:id/reject  { reason }
  adminReject: wrap(async (req, res) => {
    const rr = await ReturnRequest.findOne({ returnId: req.params.id });
    if (!rr) return fail(res, [404, 'Return request not found']);
    const reason = String(req.body?.reason || '').trim().slice(0, 300);
    if (!reason) return fail(res, [400, 'A reason is required']);
    const r = await rejectReturn(rr, reason, req.user.name);
    if (r.error) return fail(res, r.error);
    await logAudit(String(req.user._id), req.user.name, 'Return Rejected', `${rr.returnId}: ${reason}`);
    res.json({ success: true, returnRequest: r.rr });
  }),

  // POST /api/admin/returns/:id/complete — received at store without the partner app.
  adminComplete: wrap(async (req, res) => {
    const rr = await ReturnRequest.findOne({ returnId: req.params.id });
    if (!rr) return fail(res, [404, 'Return request not found']);
    const r = await partnerComplete(rr, req.user.name);
    if (r.error) return fail(res, r.error);
    res.json({ success: true, returnRequest: r.rr });
  }),

  // POST /api/admin/returns/:id/refund — pay now (or retry a failed refund).
  adminRefundNow: wrap(async (req, res) => {
    const r = await processRefund(req.params.id, { force: true });
    if (!r.ok && r.code === 'not_due') return fail(res, [409, 'No scheduled or failed refund on this request']);
    if (!r.ok) return fail(res, [502, r.message || 'Refund failed']);
    await logAudit(String(req.user._id), req.user.name, 'Return Refund Processed', `${req.params.id}: ₹${r.rr.refund.amount}`);
    res.json({ success: true, returnRequest: r.rr });
  }),
};
