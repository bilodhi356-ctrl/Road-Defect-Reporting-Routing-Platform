const router = require('express').Router();
const { Contractor, Procurement, Payment } = require('../models/Management');
const { requireAuth, allowRoles } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Report = require('../models/Report');
const { officeAliases, sameRegionalOffice } = require('../utils/routing');

router.use(requireAuth);

function officeFilter(req) {
  return req.user.role === 'officer' ? { office: { $in: officeAliases(req.user.office) } } : {};
}

function reference(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'contractor') {
      const contractor = await Contractor.findOne({ userId: req.user._id });
      if (!contractor) return res.json({ contractors: [], procurements: [], payments: [] });
      const [procurements, payments] = await Promise.all([
        Procurement.find({ contractor: contractor._id }).populate('contractor', 'name companyName').populate('reportId', 'reference category').sort({ createdAt: -1 }),
        Payment.find({ contractor: contractor._id }).populate('contractor', 'name companyName').populate('procurement', 'reference title office').sort({ createdAt: -1 })
      ]);
      return res.json({ contractors: [contractor], procurements, payments });
    }
    if (!['admin', 'coordinator', 'officer'].includes(req.user.role)) return res.status(403).json({ message: 'You do not have permission to view contractor records.' });
    const filter = officeFilter(req);
    const [contractors, procurements, payments] = await Promise.all([
      Contractor.find(filter).sort({ name: 1 }).limit(500),
      Procurement.find(filter).populate('contractor', 'name companyName').populate('reportId', 'reference category').sort({ createdAt: -1 }).limit(500),
      ['admin', 'coordinator'].includes(req.user.role)
        ? Payment.find({}).populate('contractor', 'name companyName').populate('procurement', 'reference title office').sort({ createdAt: -1 }).limit(500)
        : Promise.resolve([])
    ]);
    const visiblePayments = req.user.role === 'officer'
      ? payments.filter(item => item.procurement?.office === req.user.office)
      : payments;
    res.json({ contractors, procurements, payments: visiblePayments });
  } catch (error) { next(error); }
});

router.post('/contractors', allowRoles('admin', 'coordinator'), async (req, res, next) => {
  let createdUserId = null;
  try {
    const body = req.body || {};
    if (!body.name?.trim() || !body.office?.trim()) return res.status(400).json({ message: 'Contractor name and office are required.' });
    let userId = null;
    if (body.createLogin) {
      if (!body.email?.trim()) return res.status(400).json({ message: 'An email is required to create a contractor login.' });
      if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) return res.status(400).json({ message: 'Contractor login password must be 12 to 128 characters.' });
      if (await User.exists({ email: body.email.trim().toLowerCase() })) return res.status(409).json({ message: 'A user account already uses this email.' });
      const user = await User.create({
        name: body.name.trim(), email: body.email.trim().toLowerCase(), office: body.office.trim(),
        role: 'contractor', passwordHash: await bcrypt.hash(body.password, 12)
      });
      userId = user._id;
      createdUserId = user._id;
    }
    const contractor = await Contractor.create({
      userId,
      name: body.name, companyName: body.companyName, registrationNumber: body.registrationNumber,
      email: body.email, phone: body.phone, office: body.office,
      specialties: Array.isArray(body.specialties) ? body.specialties : String(body.specialties || '').split(',').map(v => v.trim()).filter(Boolean),
      status: ['Active', 'Inactive', 'Blacklisted'].includes(body.status) ? body.status : 'Active'
    });

    res.status(201).json({ contractor });
  } catch (error) {
    if (createdUserId) {
      try { await User.deleteOne({ _id: createdUserId }); }
      catch (cleanupError) { console.error('Unable to remove incomplete contractor login:', cleanupError.message); }
    }
    if (error.code === 11000) return res.status(409).json({ message: 'A contractor or user account already uses this email.' });
    next(error);
  }
});

router.patch('/contractors/:id', allowRoles('admin', 'coordinator'), async (req, res, next) => {
  let createdUserId = null;
  try {
    const changes = req.body || {};
    if (changes.status && !['Active', 'Inactive', 'Blacklisted'].includes(changes.status)) return res.status(400).json({ message: 'Invalid contractor status.' });
    const allowed = ['status', 'name', 'companyName', 'registrationNumber', 'email', 'phone', 'office', 'specialties'];
    const update = {};
    allowed.forEach(key => { if (changes[key] !== undefined) update[key] = changes[key]; });
    const existing = await Contractor.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Contractor not found.' });
    if (changes.createLogin) {
      if (existing.userId) return res.status(409).json({ message: 'This contractor already has a portal login.' });
      const email = String(changes.email || existing.email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid contractor email address.' });
      if (typeof changes.password !== 'string' || changes.password.length < 12 || changes.password.length > 128) return res.status(400).json({ message: 'Contractor login password must be 12 to 128 characters.' });
      if (await User.exists({ email })) return res.status(409).json({ message: 'A user account already uses this email.' });
      const user = await User.create({
        name: changes.name || existing.name,
        email,
        office: changes.office || existing.office,
        role: 'contractor',
        passwordHash: await bcrypt.hash(changes.password, 12)
      });
      createdUserId = user._id;
      update.userId = user._id;
      update.email = email;
    }
    const contractor = await Contractor.findByIdAndUpdate(existing._id, update, { new: true, runValidators: true });
    if (changes.status && contractor.userId) {
      await User.updateOne({ _id: contractor.userId }, { active: changes.status === 'Active' });
    }
    res.json({ contractor });
  } catch (error) {
    if (createdUserId) {
      try { await User.deleteOne({ _id: createdUserId }); }
      catch (cleanupError) { console.error('Unable to remove incomplete contractor login:', cleanupError.message); }
    }
    if (error.code === 11000) return res.status(409).json({ message: 'A user account already uses this email.' });
    next(error);
  }
});

router.post('/procurements', allowRoles('admin', 'coordinator', 'officer'), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.title?.trim() || !body.office?.trim()) return res.status(400).json({ message: 'Procurement title and office are required.' });
    const contractor = body.contractor ? await Contractor.findById(body.contractor) : null;
    if (body.contractor && (!contractor || contractor.status !== 'Active')) return res.status(400).json({ message: 'Choose an active contractor.' });
    let report = null;
    let office = body.office.trim();
    let status = body.status || 'Draft';
    if (req.user.role === 'officer') {
      if (!body.reportId) return res.status(400).json({ message: 'Select a report routed to your regional office.' });
      report = await Report.findById(body.reportId).select('office reference category status');
      if (!report || !sameRegionalOffice(report.office, req.user.office)) return res.status(403).json({ message: 'This report is outside your regional office.' });
      if (report.status === 'Resolved') return res.status(400).json({ message: 'Resolved reports cannot be awarded.' });
      if (!contractor) return res.status(400).json({ message: 'Choose a contractor to award this work.' });
      if (!sameRegionalOffice(contractor.office, report.office)) return res.status(400).json({ message: 'Choose a contractor registered to the report’s regional office.' });
      if (!Number.isFinite(Number(body.awardedAmount)) || Number(body.awardedAmount) <= 0) return res.status(400).json({ message: 'Enter an awarded contract amount greater than zero.' });
      office = report.office;
      status = 'Awarded';
    } else if (contractor && !sameRegionalOffice(contractor.office, office)) {
      return res.status(400).json({ message: 'Contractor and procurement must belong to the same regional office.' });
    }
    const procurement = await Procurement.create({
      reference: body.reference?.trim().toUpperCase() || reference('PROC'),
      title: body.title, reportId: report?._id || body.reportId || null, contractor: contractor?._id || null,
      office, category: body.category, estimatedAmount: Number(body.estimatedAmount || 0),
      awardedAmount: Number(body.awardedAmount || 0), status,
      startDate: body.startDate || undefined, endDate: body.endDate || undefined, notes: body.notes || '',
      createdBy: req.user._id
    });
    await procurement.populate('contractor', 'name companyName');
    res.status(201).json({ procurement });
  } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'That procurement reference already exists.' }); next(error); }
});

router.patch('/procurements/:id', allowRoles('admin', 'coordinator'), async (req, res, next) => {
  try {
    const allowed = ['status', 'contractor', 'awardedAmount', 'estimatedAmount', 'startDate', 'endDate', 'notes'];
    const changes = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) changes[key] = req.body[key]; });
    const procurement = await Procurement.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true }).populate('contractor', 'name companyName');
    if (!procurement) return res.status(404).json({ message: 'Procurement not found.' });
    res.json({ procurement });
  } catch (error) { next(error); }
});

router.patch('/my/procurements/:id', allowRoles('contractor'), async (req, res, next) => {
  try {
    const contractor = await Contractor.findOne({ userId: req.user._id });
    if (!contractor) return res.status(404).json({ message: 'Contractor profile not found.' });
    const procurement = await Procurement.findOne({ _id: req.params.id, contractor: contractor._id });
    if (!procurement) return res.status(404).json({ message: 'Assigned procurement not found.' });
    if (!['In progress', 'Completed'].includes(req.body.status)) return res.status(400).json({ message: 'Choose In progress or Completed.' });
    procurement.status = req.body.status;
    if (req.body.notes?.trim()) procurement.notes = req.body.notes.trim();
    await procurement.save();
    res.json({ procurement });
  } catch (error) { next(error); }
});

router.post('/payments', allowRoles('admin', 'coordinator'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const procurement = await Procurement.findById(body.procurement);
    const contractor = await Contractor.findById(body.contractor);
    if (!procurement || !contractor || contractor.status !== 'Active') return res.status(400).json({ message: 'Choose a valid procurement and active contractor.' });
    if (procurement.contractor && String(procurement.contractor) !== String(contractor._id)) return res.status(400).json({ message: 'Payment contractor must match the contractor awarded this procurement.' });
    if (!body.amount || Number(body.amount) < 0) return res.status(400).json({ message: 'Enter a valid payment amount.' });
    const payment = await Payment.create({
      reference: body.reference?.trim().toUpperCase() || reference('PAY'),
      procurement: procurement._id, contractor: contractor._id, invoiceNumber: body.invoiceNumber,
      amount: Number(body.amount), method: body.method, status: body.status || 'Pending',
      dueDate: body.dueDate || undefined, paidAt: body.status === 'Paid' ? (body.paidAt || new Date()) : undefined,
      notes: body.notes || '', createdBy: req.user._id
    });
    await payment.populate(['contractor', 'procurement']);
    res.status(201).json({ payment });
  } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'That payment reference already exists.' }); next(error); }
});

router.patch('/payments/:id', allowRoles('admin', 'coordinator'), async (req, res, next) => {
  try {
    const allowed = ['status', 'invoiceNumber', 'amount', 'method', 'dueDate', 'paidAt', 'notes'];
    const changes = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) changes[key] = req.body[key]; });
    if (changes.status === 'Paid' && !changes.paidAt) changes.paidAt = new Date();
    if (changes.status && changes.status !== 'Paid') changes.paidAt = undefined;
    const payment = await Payment.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true }).populate('contractor', 'name companyName').populate('procurement', 'reference title office');
    if (!payment) return res.status(404).json({ message: 'Payment not found.' });
    res.json({ payment });
  } catch (error) { next(error); }
});

module.exports = router;
