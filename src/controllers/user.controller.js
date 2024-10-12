import {asyncHandler} from '../utils/asyncHandler.js';

const RegisterUser = asyncHandler (async (req, res) => {
  res.status (200).json ({
    message: 'Server Connected',
  });
});



export default RegisterUser;
