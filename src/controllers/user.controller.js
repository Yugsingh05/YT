import { asyncHandler } from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { User } from "../models/user.modle.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

  const loggedInUser = await User.findById(_id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

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

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(200, {}, "User logged Out Successfully")
    )

})


export {
  RegisterUser,
  loginUser,
  logoutUser
};
