# ClinGen Curation Database and Interface
This software creates an object store and user interface for the collection of mappings between human diseases and genetic variation as input by the ClinGen curation staff.

# To support multiple versions of node:
##      First time setup:
        1. Install node version manager (nvm)
        curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash
        2. source ~/.bashrc
                Here are the node settings in .bashrc. The install adds it automatically
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
                [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
        3. nvm --version
                0.35.2
        4. nvm install 10.16
        5. nvm use 10.16

##       Switchin to 10.16:
        1. source ~/.bashrc
        2. nvm use 10.16


        
## Current Branching and Merge Strategy
Application is divided into to main branches Dev and Master. Dev is the main branch for refactor development and holds the most up-to-date stable code.  After Dev branch has been sufficiently tested and deemed ready for production work loads it can be merged with master.  Branches for development are created off of dev and named in the following pattern.  'Feature/{CORRESPONDING-JIRA-TICKET}/{DESCRIPTION}'.  For example if you were creating a new branch to work on a new feature for variant approvals it might look like this: feature/CLINAWS-73/variant-approval.  Ultimately the git strategy used by this project most closely resembles git flow as documented [here](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)  

Steps to branching and merging
1. Clone repo
2. git checkout dev
3. git checkout -b feature-branch
4. Do all work here
5. git commit and git push feature-branch
6. git merge dev (pull dev into feature-branch for testing)
7. git push
8. git checkout dev
9. git merge feature-branch

## Dev Setup
### Pre Reqs
1. Serverless CLI installed on machine

### Setting up Backend Dev environment
Clone the GCI-VCI-AWS repository/pull dev
Follow the branching strategy above to switch to the feature specific branch for the story you are working on.

#### Option A: Developing Locally
Follow the README found in <b>gci-vci-serverless</b> to set up serverless offline and dynamodb local.  Replace the value in <b>gci-vci-react/config.js</b> with the localhost endpoint started by `serverless offline`

#### Option B: Developing against Dev database  
From the gci-vci-serverless directory run `serverless info --stage dev` take the base endpoint URL (everything before /variants in the first line) and place that value in <b>gci-vci-react/config.js</b>

For development Amplify should no longer be needed.

# Pipeline Setup
1. Edit `gci-vci-serverless-samplePolicy.json` so that it represents the correct stage needed for the pipeline.  This will consist of editing the Resources sections to change from `gci-vci-*` to `gci-vci-STAGE`
2. On the AWS Console create a new role that trusts CodeBuild.
3. Create a new policy to be associated with the role and inpute the json from `gci-vci-serverless-samplePolicy.json`
4. On the Console navigate to CodePipeline.  Click create new Pipeline
5. Allow CodePipeline to create a new role for you.  This role is used by Code Pipeline and is different from the role we just created which will be used by CodeBuild shortly
6. Select Source Provider as github and connect to github.  It is important that the individual who creates this connection has the proper permissions and will be at ClinGen for the forseeable future, best practice here would be to utilize a organizational account not owned by an individual.
7. Select the gci-vci-aws repository and select desired branch.
8. Select change detections as GitHub Webhooks,  this will allow AWS to detect changes in your selected branch and automatically build the project when a change is pushed to the branch
9. Select build tool as AWS CodeBuild and click Create Project
10. Give your CodeBuild a project name, make sure to include the stage name this build will be for.
11. Select managed image and an Ubuntu operating system;  Runtime Standard; Image Standard4.0; Environment Type Linux
12. Select existing role and use the role you created in steps 1-3
13. Select use buildspec file.  
14. Finish up in CodePipeline
## Watch closely as these instructions will probably be updated in the near future.
