#!/usr/bin/env node
import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { QdrantDockerImageEcrDeploymentCdkStack } from '../lib/qdrant-docker-image-ecr-deployment-cdk-stack';
import { IEnvTypes } from '../process-env-typed';
import { QdrantDockerImageEcsDeploymentCdkStack } from '../lib/qdrant-docker-image-ecs-deployment-cdk-stack';

dotenv.config(); // Load environment variables from .env file
const app = new cdk.App();

const { CDK_DEFAULT_ACCOUNT: account, CDK_DEFAULT_REGION: region } = process.env;

const cdkRegions = process.env.CDK_DEPLOY_REGIONS?.split(',') ?? [region]; // Parsing comma separated list of regions
const deployEnvironments = process.env.ENVIRONMENTS?.split(',') ?? ['dev']; // Parsing comma separated list of environments

export const LATEST_IMAGE_VERSION = 'latest';

/*
 * Check if the environment variables are set
 * @param args - Environment variables to check
 * @throws Error if any of the environment variables is not set
 * @returns void
 * */
function checkEnvVariables(...args: string[]) {
    const missingVariables = args.filter(arg => !process.env[arg]);
    if (missingVariables.length > 0) {
        throw new Error(`The following environment variables are not set yet: ${missingVariables.join(', ')}. Please set them in .env file or pipeline environments.`);
    }
};

// check if the environment variables are set
checkEnvVariables('ECR_REPOSITORY_NAME', 'APP_NAME', 'PLATFORMS', 'APP_ROOT_FILE_PATH');

const envTypes: IEnvTypes = {
    ECR_REPOSITORY_NAME: process.env.ECR_REPOSITORY_NAME ?? `qdrant-docker-image-erc-repository`,
    APP_NAME: process.env.APP_NAME ?? `qdrant-vectordatabase`,
    IMAGE_VERSION: process.env.IMAGE_VERSION ?? LATEST_IMAGE_VERSION,
    PLATFORMS: process.env.PLATFORMS ?? `amd64`,
    APP_ROOT_FILE_PATH: process.env.APP_ROOT_FILE_PATH!,
};

for (const cdkRegion of cdkRegions) {
    for (const environment of deployEnvironments) {
        const repositoryName = `${envTypes.ECR_REPOSITORY_NAME}-${environment}`;
        const appName = envTypes.APP_NAME;
        const imageVersion = envTypes.IMAGE_VERSION ?? LATEST_IMAGE_VERSION;

        new QdrantDockerImageEcrDeploymentCdkStack(app, `QdrantDockerImageEcrDeploymentCdkStack-${cdkRegion}-${environment}`, {
            env: {
                account,
                region: cdkRegion,
            },
            tags: {
                environment,
            },
            repositoryName,
            appName,
            imageVersion,
            environment: environment
        });

        new QdrantDockerImageEcsDeploymentCdkStack(app, `QdrantDockerImageEcsDeploymentCdkStack-${cdkRegion}-${environment}`, {
            env: {
                account,
                region: cdkRegion,
            },
            tags: {
                environment,
            },
            repositoryName,
            appName,
            imageVersion,
            environment: environment,
            platformString: `amd64`,
            appRootFilePath: envTypes.APP_ROOT_FILE_PATH,
        });
    }
}

app.synth();
