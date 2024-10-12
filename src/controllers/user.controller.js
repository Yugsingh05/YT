import { asyncHandler } from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { User } from "../models/user.modle.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const RegisterUser = asyncHandler(async (req, res) => {
  // get user data
  // check if all fields are not empty
  // check if the user already exists or not
  // check for images , check fro avatar
  // upload images on clodinary
  // create user object in db
  // remove password and refresh Token  from the reponse
  // check if the user is created or not
  /// return res

  const { userName, password, email, fullName } = req.body;

  console.log(email);
  if (
    [userName, email, password, fullName].some(field => field?.trim() === "")
  ) {
    throw new ApiErrors(400, "All the fields are required");
  }

  if (email.includes("@")) {
    return true;
  } else {
    throw new ApiErrors(400, "type email correctly");
  }

  const IsUserNameExist = User.findOne({ userName });
  if (IsUserNameExist) {
    throw new ApiErrors(409, "UserName already exists");
  }

  console.log();

  const IsEmailExist = User.findOne({ email });
  if (IsEmailExist) {
    throw new ApiErrors(409, "Email already exists");
  }

  console.log(IsEmailExist);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiErrors(400, "Avatar field is necessary");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  console.log("Avatar ", avatar);
  if (!avatar) {
    throw new ApiErrors(400, "Avatar field is necessary");
  }

  const user = await User.create({
    userName: userName.toLowerCase(),
    fullName,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const userCreated = User.findById(user._id).select("-password -refreshToken");

  if (!userCreated) {
    throw new ApiErrors(500, "Error at creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, userCreated, "user created successfully"));
});

export default RegisterUser;
