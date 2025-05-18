import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Teacher } from "../models/Teacher.model.js";

//Below there is no use of res so we can also write it as _ in production level these things are done like e.g below
//(req, _, next)
export const verifyTeachersJWT = asyncHandler(async (req, res, next)=>{
  try {
      const token = req.header("Authorization")?.replace("Bearer ","") || req.cookies?.refreshToken;
      console.log('token in server:', token, req.header("Authorization")?.replace("Bearer ",""));
    
      if(!token){
          throw new ApiError(401, "Unauthorized Request");
      }
     
     const decodedToken = jwt.verify(token, process.env.RefreshTokenSecret);
  
     const teacher = await Teacher.findById(decodedToken?._id).select("-refreshToken");
  
     if(!teacher){
      throw new ApiError(401, "Invalid Access Token");
     }
  
     req.teacher = teacher;
     console.log('req.teacher log:', req.teacher);
     
     next()
  } catch (error) {
     throw new ApiError(401, error?.message || "Invalid Access Token")
  }

})