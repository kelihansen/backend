# Together Server

Designed to support Together, an app for strengthening friendships.

Find the deployed app: https://together-alchemy.herokuapp.com\
Find the front-end code: https://github.com/kelihansen/friends-frontend

This code represents Keli Hansen's continued work on the [Alchemy Code Lab](https://www.alchemycodelab.com) final project found at https://github.com/eighthnote.

## Requirements

MongoDB & Node.js

## Installation

After cloning this repository,

1. Install dependencies:

    ```
    npm i
    ```

1. Create a `.env` file based on the example file. Suggested values:

    ```
    MONGODB_URI=mongodb://localhost:27017/friends
    PORT=3000
    APP_SECRET=anythingsecretyoulike
    ```


## Usage

If you choose to run tests, create an additional `.env` file based on the example in the e2e test folder and make sure your database is running.

Tests can be run with the following terminal commands:
1. `npm test`,
1. `npm run test:watch`,
1. `npm run test:unit`,
1. `npm run test:e2e`

Launch the server with `npm start` or `npm run start:watch`.

## Credits

Keli Hansen, Victor Bofill, Katlyn Tucker, Marty Nelson