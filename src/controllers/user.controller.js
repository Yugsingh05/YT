import { asyncHandler } from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { User } from "../models/user.modle.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const options = {
  httpOnly: true,
  secure: true
}

const generateAccessOrRefreshToken = async (userId) => {

  try {
    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }

  } catch (error) {

    throw new ApiErrors(500, "something wrong at generating refresh token")

  }


}


const RegisterUser = asyncHandler(async (req, res) => {
  // Extract user data from the request body
  const { userName, password, email, fullName } = req.body;

  // Log input data for debugging
  console.log(email, password, fullName, userName);

  // Check if any required fields are empty or missing
  if ([userName, email, password, fullName].some(field => !field?.trim())) {
    throw new ApiErrors(400, "All the fields are required");
  }

  if (!email.includes("@")) {
    throw new ApiErrors(400, "Invalid Email");
  }
  // Check if the username already exists in the database
  const isUserNameExist = await User.findOne({ userName });
  if (isUserNameExist) {
    throw new ApiErrors(409, "UserName already exists");
  }

  // Check if the email already exists in the database
  const isEmailExist = await User.findOne({ email });
  if (isEmailExist) {
    throw new ApiErrors(409, "Email already exists");
  }

  // Extract paths for uploaded avatar and cover images
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  let coverImageLocalPath;
  if (req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  // Check if avatar image is provided
  if (!avatarLocalPath) {
    throw new ApiErrors(400, "Avatar field is necessary");
  }

  // Upload images to Cloudinary and handle potential errors
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  let coverImage = null;
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  // Log the uploaded avatar for debugging
  console.log("Avatar uploaded to Cloudinary:", avatar);

  // Ensure avatar upload was successful
  if (!avatar || !avatar.url) {
    throw new ApiErrors(400, "Failed to upload avatar to Cloudinary");
  }

  // Create the user object in the database with the uploaded images
  const user = await User.create({
    userName: userName.toLowerCase(),
    fullName,
    email: email.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // Retrieve the created user, excluding sensitive fields like password and refreshToken
  const userCreated = await User.findById(user._id).select("-password -refreshToken");

  // Verify that the user was created successfully
  if (!userCreated) {
    throw new ApiErrors(500, "Error at creating user");
  }

  // Respond with the created user data
  return res.status(201).json(new ApiResponse(201, userCreated, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // find the user
  //password check
  // give him refersh token or access token
  //send cookie

  const { password, email, userName } = req.body;

  if (!email && !userName) {
    throw new ApiErrors(400, "Email or userName is required");
  }

  const user = await User.findOne(
    {
      $or: [{ userName }, { email }]
    }
  )

  if (!user) {
    throw new ApiErrors(404, "user doesn't exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiErrors(404, "Invalid password")
  }

  const { accessToken, refreshToken } = await generateAccessOrRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(

      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "user Logged In Successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    }
  )

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(200, {}, "User logged Out Successfully")
    )

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiErrors(400, "something went wrong at incoming refresh token")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiErrors(400, "something went wrong at user")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiErrors(400, "tokens are not equall")
    }

    const { accessToken, refreshToken } = await generateAccessOrRefreshToken(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access Token is refreshed"
        )
      )
  } catch (error) {

    throw new ApiErrors(401, "something wrong at refresh token")

  }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {

  const { currentPassword, newPassword } = req.body

  const user = User.findById(req.user._id)

  const isPasswordTrue = await user.isPasswordCorrect(currentPassword)

  if (!isPasswordTrue) {
    throw new ApiErrors(400, "Invalid current password")
  }

  user.password = newPassword

  await user.save({
    validateBeforeSave: false
  })

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Password changed successfully")
    )

})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.
    status(200)
    .json(
      new ApiResponse(200, req.user, "current user fetched successfuly")
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {

  const { fullName, email, userName } = req.body

  if (!(fullName || email || userName)) {
    throw new ApiErrors(400, "No new syntax recieved")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        fullName,
        email,
        userName
      }
    },
    {
      new: true
    }
  ).select("-password")

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Account updated successfully")
    )
}
)

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiErrors(400, "Avatar field is necessary")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiErrors(400, "Error at updating avatar")
  }

  // Todo : Delete old avatar image 

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }

    },
    { new: true }
  ).select("-password")

  if (!user) {
    throw new ApiErrors(400, "Something wrong at avatar Image")
  }


  return res
    .status(200)
    .json(
      new ApiResponse(200, "Avatar updated successfuly")
    )

})

const updateUserCoverImage = asyncHandler(async (req, res) => {

  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiErrors(400, "CoverImage is required")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url) {
    throw new ApiErrors(400, "Error at updating coverImage")
  }

  // Todo : Delete old avatar image 

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    { new: true }).select("-password")

  if (!user) {
    throw new ApiErrors(500, "something wrong at updating coverImage")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "CoverImage updated Successfully")
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

  const { username } = req.params

  if (!username?.trim()) {
    throw new ApiErrors(400, "username doesn't exist")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {

        subscribersCount: { $size: "$subscribers" },

        channelsSubscribedCount: { $size: "$subscribedTo" },

        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedCount: 1,
        isSubscribed: 1

      }
    }
  ])

  console.log(channel)

  if (!channel?.length) {
    throw new ApiErrors(400, "Channel does not exist")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched Successfully")
    )

})

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: {
                $project: {
                  fullName: 1,
                  userName: 1,
                  avatar: 1
                }
              }
            }
          }
        ]
      }
    },
    {
      $addFields: {
        owner: {
          $first: "$owner"
        }
      }
    }
  ])

  if(!user.length){
    throw new ApiErrors(400,"something wrong at watchHistory")
  }


  return res
  .status(200)
  .json(
    new ApiResponse(200,user[0].getWatchHistory,"WatchHistory created successfully")
  )
})

export {
  RegisterUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
