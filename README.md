# RGB-Navigation

Help visitors traverse corridors with RGB ledstrips.

## Project structure

-   `client/`: contains the client-side web application.
-   `server/`: contains the server.
-   `api/`: contains the api client to communicate with the server.
-   `docs/`: contains documentation.
-   `arduino/`: contains source code for the Arduino that controls the RGB.
-   `compiler/`: contains the rgblang compiler, which is the programming language used to create effects on the ledstrip. Its bytecode is interpreted on the arduino.
-   `arduino-client/`: contains source code for the application that lets the Arduino communicate with the server via serial communication.
-   `smartcard-client/`: contains code that connects NFC smartcard readers to the server.

![architecture](https://git.ikdoeict.be/stijn.rogiest/rgb-navigation/-/raw/master/docs/images/architecture.png)

## Development instructions

### Requirements (first time)

Because all the projects (but `arduino`) are developed with TypeScript and NodeJS, you need to do the following to work with them:

1. Install NodeJS and PostgreSQL
2. Install yarn, by opening a terminal and executing `npm install -g yarn`
3. Navigate to `compiler/` using the terminal and execute `yarn`, then `yarn build`
4. Navigate back and to `api/` using the terminal and execute `yarn`, then `yarn build`
5. Navigate back and to `client/` using the terminal and execute `yarn`
6. Navigate back and to `server/` using the terminal and execute `yarn`
7. While in `server/`, copy the .env.example to .env and fill in the information, like database url ...
8. While in `server/`, apply the database migrations using the command `npx prisma migrate dev`

### Development mode

-   **To work on the compiler, client or server**, enter the `compiler/` directory using the terminal and execute `yarn start`. It will now keep recompiling your code while you change something in the compiler directory. To compile it only once, execute `yarn build` instead.
-   **To work on the api, client or server**, enter the `api/` directory using the terminal and execute `yarn start`. It will now keep recompiling your code while you change something in the api directory. To compile it only once, execute `yarn build` instead.
-   **To work on the client**, make sure api and compiler are built, then enter the `client/` directory using the terminal and execute `yarn start`.
-   **To work on the server**, make sure your database is running, the api and compiler are built, then enter the `server/` directory using the terminal and execute `yarn start`.

## License

MIT 2021 (c) maintainers
