const mongoose = require('mongoose');

const contractorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  companyName: { type: String, trim: true, maxlength: 120, default: '' },
  registrationNumber: { type: String, trim: true, maxlength: 80, default: '' },
  email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
  phone: { type: String, trim: true, maxlength: 40, default: '' },
  office: { type: String, required: true, trim: true, maxlength: 120 },
  specialties: [{ type: String, trim: true, maxlength: 80 }],
  status: { type: String, enum: ['Active', 'Inactive', 'Blacklisted'], default: 'Active', index: true }
}, { timestamps: true });

const procurementSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true, maxlength: 40 },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
  contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', default: null },
  office: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, enum: ['Emergency repair', 'Routine maintenance', 'Pavement works', 'Drainage works', 'Bridge works', 'Other'], default: 'Other' },
  estimatedAmount: { type: Number, min: 0, default: 0 },
  awardedAmount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['Draft', 'Tendering', 'Awarded', 'In progress', 'Completed', 'Cancelled'], default: 'Draft', index: true },
  startDate: Date,
  endDate: Date,
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true, maxlength: 40 },
  procurement: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement', required: true },
  contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', required: true },
  invoiceNumber: { type: String, trim: true, maxlength: 80, default: '' },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['Bank transfer', 'Cheque', 'Mobile money', 'Other'], default: 'Bank transfer' },
  status: { type: String, enum: ['Pending', 'Approved', 'Paid', 'Rejected'], default: 'Pending', index: true },
  dueDate: Date,
  paidAt: Date,
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = {
  Contractor: mongoose.model('Contractor', contractorSchema),
  Procurement: mongoose.model('Procurement', procurementSchema),
  Payment: mongoose.model('Payment', paymentSchema)
};
