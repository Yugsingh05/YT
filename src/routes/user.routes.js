import {Router} from 'express';
import { RegisterUser,  loginUser, logoutUser } from '../controllers/user.controller.js';
import {upload} from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {refreshAccessToken} from '../controllers/user.controller.js'

const router = Router ();

router.route('/register').post (
    upload.fields([
        {
            name : "avatar",
            maxCount: 1
        },{
            name : "coverImage",
            maxCount: 1
        }
    ])
    ,
    RegisterUser
);

router.route("/login").post(loginUser)

// secured routes

router.route("/logout").post(verifyJWT,logoutUser)

router.route("/refresh-token").post(refreshAccessToken)
export default router;
