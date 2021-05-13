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

Because all the projects (but `arduino`) are developed with TypeScript and NodeJS, you need to do the following to work with them:

-   Install NodeJS & npm, make sure they are available in path.
-   Optionally install yarn: `npm install -g yarn`
-   Every project has a start script which you can run using `npm run start` or `yarn start`. Make sure you cd to the project directory first. When running a project for the first time, use `npm install` or `yarn` to install the dependencies.

## License

MIT 2021 (c) maintainers
