# GCI VCI Serverless

This project contains the source for basic features of the CCI VCI serverless API. This project is
built with the Serverless framework which makes for simple deployments and code organization.

## Dependencies

This project has a few initial dependencies that you need to install prior to setting up the serverless framework:

### NodeJS and npm

This project has been tested with NodeJS v8.16.0 and npm v6.4.1. In order to minimize impact on other projects it's
suggested that you manage NodeJS versions using [nvm](https://github.com/nvm-sh/nvm). You can follow the instructions for
installing nvm and the necessary node versions found on the nvm Github page.

### Python

This project depends on Python 3.7. A simple way to install Python3 is via [Homebrew](https://formulae.brew.sh/formula/python):

```
> brew install python3
```

There are other methods of installing Python such as using version managers such as [pyenv](https://github.com/pyenv/pyenv).

### Boto3

For local development and testing this project requires [Boto3](https://aws.amazon.com/sdk-for-python/) which is the recommended
AWS SDK for Python applications. You can install Boto3 via:

```
> pip3 install boto3
```

### Requests

The application uses the [requests](https://requests.readthedocs.io/en/master/) for HTTP requests. You can install requests with:

```
> pip3 install requests
```

With all of the system dependencies installed you can install the project specific dependencies via npm. From the directory that contains
the `package.json` file run `npm install`. This command will inspect the `package.json` file and install the required dependencies.

## Local Development

### Starting a Local Development Environment

The easiest way to test locally is by leveraging the [serverless offline](https://serverless.com/plugins/serverless-offline/) and [serverless dynamodb local](https://serverless.com/plugins/serverless-dynamodb-local/) 
plugins. 

The first time you run DynamoDB Local you must run the install command. This command will createa a `.dynamodb` directory which contains all of your local database information:

```
> serverless dynamodb install
```

Next (and any subsequent time you want to start DynamoDB Local) start the dynamodb server:

```
> serverless dynamodb start --migrate
```

This command will look at the dynamodb table definition in the resources block of the serverless.yml file and start a local dynamodb instance.

Next, start serverless offline:

```
> serverless offline --noTimeout 
```

We should specify the `--noTimeout` option because I've found that the dynamodb local plugin - while useful - can be slow in development. This command will start an HTTP server at http://localhost:3000 by default. You can optionally specify the `--port XXXX` option if you want serverless offline to run on a different port.

### Stopping a Local Development Environment

To stop serverless offline simply ctrl+C in your terminal. To stop dynamodb you can run the following command (making sure to change the port number if you changed it from the default):
 
```
> kill -9 $(lsof -i TCP:8000| grep LISTEN | awk '{print $2}')
```

Future improvement: the documentation for serverless dynamodb local claims to stop the server when serverless offline stops or by ctrl+C in the terminal that started it. I've found neither to be
true and you must use the above command to stop it manually.

### Deleting a Local Development Database

To remove the database for any reason (e.g. the schema changes in the serverless file) simply delete the [.dynamodb](.dynamodb) directory and then run the following command again:

```
> serverless dynamodb install
```

## Deployment to AWS

Deploy to AWS using the command `serverless deploy --stage {STAGE} --aws-profile {AWS_PROFILE}`

The STAGE variable defaults to `dev` but you can specify that option if you want to explicitly name it (e.g. multiple developers wanting to deploy their own instance of the service).

### Removing an Existing AWS Deployment

You can remove an existing stage by running the following command:

```
> serverless remove --stage {STAGE} --aws-profile {AWS_PROFILE}
```

### Scaling DynamoDB in AWS

When deploying to AWS initially, DynamoDB provisioned throughput is necessary to avoid any throttling errors.  Once All messages have been received from Kafka and processed the capacity on the GeneVariantVPT table needs to be switched to on-demand to keep costs down.

[Setting On-Demand Scaling for DynamoDB](https://aws.amazon.com/blogs/aws/amazon-dynamodb-on-demand-no-capacity-planning-and-pay-per-request-pricing/)
