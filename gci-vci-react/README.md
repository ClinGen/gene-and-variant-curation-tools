This project is the frontend component of ClinGen GCI-VCI v2.0

## To run in development

In the project directory, you can run:

### `npm install`

Installs the app dependencies as found in package.json, this command should be run after each pull from the repo.

### `npm start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (Webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Deployment with amplify

The following only needs to be done the first time you deploy the project in an environment
Start by installing the Amplify CLI on your computer.  
`npm install -g @aws-amplify/cli`
`amplify configure`
then run.

### `amplify init`

This command will ask for an AWS profile as well as some basics about your project

### `amplify add hosting`

Here we can select either production hosting on cloudfront or development hosting on S3

## `amplify publish`

This command will push your code to a live website.

## Using an exisiting amplify environment

Because the amplify configuration is in git ignore sometimes when you pull new code your amplify resources will no longer be tied to the project.  To quickly reattach them run.

### `amplify init`

This will ask you for both a profile and if you would like to use a existing environment stage.  Select your amplify profile and the environment stage and then hit continue.  Amplify will then rebuild the project attaching your existing amplify stage to the code base.


## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

