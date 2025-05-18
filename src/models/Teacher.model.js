import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const teacherSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    mobileNo: { type: String, required: true },
    tutionName: { type: String, required: true },
}, {
    timestamps: true
});

teacherSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this.id,
            email: this.email,
            fullName: this.fullName
        },
        process.env.AccessTokenSecret,
        {
            expiresIn: process.env.AccessTokenExpiry
        }
    )
}

teacherSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this.id,

        },
        process.env.RefreshTokenSecret,
        {
            expiresIn: process.env.RefreshTokenExpiry
        }
    )
}

export const Teacher = mongoose.model("Teacher", teacherSchema);