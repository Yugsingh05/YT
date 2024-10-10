import dotenv from 'dotenv';
import ConnectDB from './db/index.js';
import {app} from './app.js';

dotenv.config ({
  path: './env',
});

ConnectDB ()
  .then (() => {
    const PORT = process.env.PORT;

    app.on ('error', error => {
      console.log ('Error Occured before app', error);
      throw error;
    });

    app.listen (PORT, () => {
      console.log (` Server is listening at ${PORT}`);
    });
  })
  .catch (error => {
    console.log ('Error at express', error);
  });
