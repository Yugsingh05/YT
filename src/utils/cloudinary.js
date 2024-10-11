import {v2 as cloudinary} from 'cloudinary';
import {fs} from 'fs';

cloudinary.config ({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async localFilePath => {
  try {
    if (!localFilePath)
      return alert ('The file path is missing at cloudinary.js');

    const response = await cloudinary.uploader(localFilePath, 
        {
            resource_type : "auto"
        });

        console.log("the file has been uploaded successfully , ",response)
        return response
  } catch (error) {
    fs.unlinkSync(localFilePath) // remove the file from the local server ,when the upload got failed

    return null

  }
};

export {uploadOnCloudinary}
