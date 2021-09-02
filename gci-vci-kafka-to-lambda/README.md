### NOTE: Consumer Concurrency

For optimal performance the ECS service should be deployed with a task count that matches the number of partitions in Kafka.  At the time of this writing there are 20 partitions in Kafka.

## Deployment notes

This should be deployed in two steps. First, build the docker image, then
deploy using the script.

1. Build the image. This is a standard docker command, and you can tag
   the image as you'd like. Here I've used kafka:latest

```sh
docker build . -t kafka:latest
```
2. Deploy the infrastructure. The create-kafka-to-lambda script will handle
   most of the heavy lifting. Mostly this deploys the CloudFormation template,
   but as CloudFormation will expect the service to be running before it considers
   the stack as created, we must also push the docker image to the repository
   created by the CloudFormation script. Also, CloudFormation does not support
   SecureString type parameters, so the script does this work before launching
   the stack. It also helps find some defaults like the VPC id for the default
   VPC should you not provide this information. Running the script without
   parameters will give you usage information, but this is how it was run for
   testing. Docker (or podman) will need to be installed for the script to
   be successful.

```sh
./create-kafka-to-lambda kafka-to-lambda 4LYO267GMEJZOLAU kafka:latest echo
```

   The 4LY... is the username for the kafka test topic. "echo" is the name
   of the Lambda function used for testing and should be changed accordingly.
   
   The lambda function that you should use on deployment can be found in the gci-vci-serverless directory.  To deploy Kafka with that lambda function.
   
   ```sh
   ./create-kafka-to-lambda kafka-to-lambda 4LYO267GMEJZOLAU kafka:latest gci-vci-serverless-template-gci-vci-kafka-cspec
   ```

   The names MUST match or Kafka won't call the specified lambda function. Use changes to the lambda function to control how Kafka data is read into your account.

   Some Parameter overrides will be needed for production. Those notes are below.

   The script will prompt for the password separately to keep this information
   out of shell history/process information/etc.

### Production deployment

   The script is configured for the Stanford staging environment, but can
   be used for production as the CloudFormation templates have the necessary
   parameters. To inject these parameters, you will need to define an
   environment variable "EXTRAPARAMS". Example:

 ```sh
 export EXTRAPARAMS="ParameterKey=KafkaBootstrapServers,ParameterValue=myservers:9092 ParameterKey=KafkaTopicName,ParameterValue=stanford-prod"
 # ./create-kafka-to-lambda ...
 ```

   Available parameters are defined at the top of the CloudFormation.yaml file.

   There is no mechanism for adding Kafka-specific environment variables, so
   anything you'd like to modify there should be done in the CloudFormation.yaml
   file directly.

### Tearing down the infrastructure

   If (when), you'd like to tear down the stack, this is best done through
   the delete-kafka-to-lambda script, which will remove the repository manually
   (as CloudFormation will not delete a repository unless it's empty) and
   delete the manually added parameter afterwards. Usage information is
   available, but this simply takes the stack name to delete.

### Resources created

   The CloudFormation and script will create these resources:

   * Security group: Allows the container to contact the Internet
   * Task role: Allows the container to invoke the Lambda function
   * Task definition: Provides the configuration information for the container
   * Execution role: Specifies permissions for ECS to setup the container,
                     including permissions to read the password.
   * ECR Repository: Repository for the docker image
   * Service: ECS Service to manage the container(s), making sure the containers
              stay working properly, restarting as needed, etc.
   * Cluster: ECS Clusters are necessary to manage any services/tasks contained
              within. Since we are using ECS Fargate, there is little practical
              use for the cluster in this case, but it is necessary.
   * CloudWatch Logs Group: Holds the container logs.
   * SSM Parameter: Stores the Kafka password securely

   Costs as configured by default are approximately $20/month. All costs are
   generated from the ECS Service.
