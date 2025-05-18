import mongoose from "mongoose";

const feeRecordSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    class: { type: String, required: true },
    month: { type: String, required: true },  
    year: { type: Number, required: true }, 
    amountPaid: { type: Number, default: 0 },
    datePaid: { type: Date, default: null },
    status: { type: String, enum: ["Paid", "Pending"], default: "Pending" }
}, { timestamps: true });

export const FeeRecord = mongoose.model('FeeRecord', feeRecordSchema);
