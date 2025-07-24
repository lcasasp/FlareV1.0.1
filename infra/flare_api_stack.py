from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    aws_ecr as ecr,
    aws_lambda as _lambda,
    aws_opensearchservice as opensearch,
    aws_apigatewayv2 as apigw,
    aws_apigatewayv2_integrations as integ,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_logs as logs,
    CfnOutput,
)
from constructs import Construct
from constants import ECR_REPO_NAME, IMAGE_TAG


class FlareApiStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, *, stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ---------------------------------------------------------------------
        # 1. Network (single-AZ, no NAT to keep <free-tier costs)
        # ---------------------------------------------------------------------
        vpc = ec2.Vpc(
            self,
            "Vpc",
            max_azs=1,
            nat_gateways=0,  # Lambda + OpenSearch live inside the VPC
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    name="Private",
                    cidr_mask=24,
                )
            ],
        )

        # Security group shared by Lambda & OpenSearch (all-traffic within SG)
        sg = ec2.SecurityGroup(
            self,
            "FlareSg",
            vpc=vpc,
            description="Allow Lambda to OpenSearch HTTPS traffic",
        )
        sg.add_ingress_rule(sg, ec2.Port.tcp(443), "intra-SG TLS")

        # ---------------------------------------------------------------------
        # 2. IAM role that Lambda(s) will assume
        # ---------------------------------------------------------------------
        lambda_role = iam.Role(
            self,
            "ApiRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaVPCAccessExecutionRole"
                ),
            ],
        )

        # ---------------------------------------------------------------------
        # 3. OpenSearch Service domain (1× t3.small, dev-friendly)
        # ---------------------------------------------------------------------

        domain = opensearch.CfnDomain(
            self,
            "Domain",
            engine_version="OpenSearch_2.13",
            cluster_config=opensearch.CfnDomain.ClusterConfigProperty(
                instance_type="t3.small.search",
                instance_count=1,
            ),
            ebs_options=opensearch.CfnDomain.EBSOptionsProperty(
                ebs_enabled=True,
                volume_size=10,
            ),
            vpc_options=opensearch.CfnDomain.VPCOptionsProperty(
                subnet_ids=[vpc.select_subnets().subnet_ids[0]],
                security_group_ids=[sg.security_group_id],
            ),
            access_policies={
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": lambda_role.role_arn},
                        "Action": "es:*",
                        "Resource": f"arn:aws:es:{self.region}:{self.account}:domain/*",
                    }
                ],
            },
        )

        # ---------------------------------------------------------------------
        # 4. Docker image Lambda
        # ---------------------------------------------------------------------
        repo = ecr.Repository.from_repository_name(self, "Repo", ECR_REPO_NAME)

        lambda_fn = _lambda.DockerImageFunction(
            self,
            "ApiFn",
            role=lambda_role,
            code=_lambda.DockerImageCode.from_ecr(repo, tag=IMAGE_TAG),
            vpc=vpc,
            security_groups=[sg],
            memory_size=1024,
            architecture=_lambda.Architecture.ARM_64,
            timeout=Duration.seconds(30),
            environment={
                "STAGE": stage,
                "OPENSEARCH_ENDPOINT": f"https://{domain.attr_domain_endpoint}",
                "ER_APIKEY": "ea5d1155-3e89-4abe-b936-ae5fb20253f9",
            },
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        # ---------------------------------------------------------------------
        # 5. HTTP API Gateway v2
        # ---------------------------------------------------------------------
        api = apigw.HttpApi(
            self,
            "HttpApi",
            api_name=f"flare-api-{stage}",
            cors_preflight=apigw.CorsPreflightOptions(
                allow_methods=[apigw.CorsHttpMethod.ANY],
                allow_origins=[
                    "https://flare-news.com",
                    "https://flare-news.vercel.app",
                    "https://flare-ui-eta.vercel.app",
                    "http://localhost:3000",
                ],
            ),
        )

        api.add_routes(
            path="/{proxy+}",
            methods=[apigw.HttpMethod.ANY],
            integration=integ.HttpLambdaIntegration(
                "LambdaProxyIntegration", handler=lambda_fn
            ),
        )

        # ---------------------------------------------------------------------
        # 6. Outputs
        # ---------------------------------------------------------------------
        CfnOutput(self, "ApiUrl", value=api.url,
                  export_name=f"FlareApiUrl-{stage}")
        CfnOutput(
            self,
            "DomainEndpoint",
            value=domain.attr_domain_endpoint,
            export_name=f"FlareDomain-{stage}",
        )
