import mongoose from 'mongoose';
import {DB_NAME} from '../constants.js';

const ConnectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect (
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );

    console.log("mongo connect")

    console.log (` MongoDB connected : ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log ('MongoDB Connection ERROR', error);

    process.exit (1);
  }
};

export default ConnectDB;
