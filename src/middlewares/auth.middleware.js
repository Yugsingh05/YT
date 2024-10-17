import {asyncHandler} from '../utils/asyncHandler'
import {ApiErrors} from '../utils/ApiErrors'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.modle'

export const verifyJWT = asyncHandler( async(req,res,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiErrors(401,"unauthorized user")
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
    
        if(!user)
        {
            throw new ApiErrors(401,"invalid accessToken")
        }
    
        req.user = user;
        next()
    } catch (error) {

        throw new ApiErrors(error?.message || "Invalid token")
        
    }
})