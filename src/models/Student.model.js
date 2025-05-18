import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String },
    mobileNo: { type: String, required: true },
    class: { type: String, required: true },
    board: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }, // Linked to a teacher
    subjects: {type: String, required: true},
    fee: {type: Number, required: true},
    joinedDate: { type: Date, default: Date.now }, // Date when student joined
    left: {
        isLeft: { type: Boolean, default: false }, // Whether student has left
        dateLeft: { type: Date, default: null } // When they left
    }
}, { timestamps: true });

export const Student = mongoose.model('Student', studentSchema);
