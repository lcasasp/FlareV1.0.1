from aws_cdk import (
    Stack, Duration, RemovalPolicy, CfnOutput,
    aws_ecr as ecr,
    aws_lambda as _lambda,
    aws_opensearchservice as opensearch,
    aws_apigatewayv2 as apigw,
    aws_apigatewayv2_integrations as integ,
    aws_events as events,
    aws_events_targets as targets,
    aws_iam as iam,
    aws_logs as logs,
)
from constructs import Construct
from constants import ECR_REPO_NAME, IMAGE_TAG, INGEST_QUERIES


class FlareApiStack(Stack):
    def __init__(self, scope: Construct, cid: str, *, stage: str, **kwargs) -> None:
        super().__init__(scope, cid, **kwargs)

        # ───────────────────────────────────────── 1. Shared role
        lambda_role = iam.Role(
            self, "LambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                )
            ],
        )

        # ───────────────────────────────────────── 2. Public OpenSearch
        domain_name = f"flare-events-{stage}"
        domain = opensearch.CfnDomain(
            self, "Domain",
            domain_name=domain_name,
            engine_version="OpenSearch_2.13",
            cluster_config=opensearch.CfnDomain.ClusterConfigProperty(
                instance_type="t3.small.search",
                instance_count=1,
            ),
            ebs_options=opensearch.CfnDomain.EBSOptionsProperty(
                ebs_enabled=True,
                volume_size=10,
            ),
            access_policies={
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": lambda_role.role_arn},
                        "Action": "es:*",
                        "Resource": f"arn:aws:es:{self.region}:{self.account}:domain/{domain_name}/*"
                    }
                ],
            },
        )
        public_endpoint = f"https://{domain.attr_domain_endpoint}"

        # ───────────────────────────────────────── 3. One ECR image
        repo = ecr.Repository.from_repository_name(self, "Repo", ECR_REPO_NAME)

        def docker_fn(id_: str, timeout_sec: int, handler: str) -> _lambda.DockerImageFunction:
            return _lambda.DockerImageFunction(
                self, id_,
                role=lambda_role,
                code=_lambda.DockerImageCode.from_ecr(
                    repo,
                    tag=IMAGE_TAG,
                    cmd=[handler],
                ),
                architecture=_lambda.Architecture.ARM_64,
                memory_size=1024,
                timeout=Duration.seconds(timeout_sec),
                environment={
                    "STAGE": stage,
                    "OPENSEARCH_ENDPOINT": public_endpoint,
                    "INGEST_QUERIES": INGEST_QUERIES[stage].strip(),
                },
                log_retention=logs.RetentionDays.ONE_WEEK,
            )

        # ───────────────────────────────────────── 4. Lambdas
        api_fn = docker_fn(
            "ApiFn", 30, "flare_backend.handler_api.lambda_handler")
        ingest_fn = docker_fn(
            "IngestFn", 60, "flare_backend.handler_ingest.lambda_handler")

        # ───────────────────────────────────────── 5. Schedule ingest (05:00 UTC)
        if stage == "prod":
            events.Rule(
                self, "DailyIngest",
                schedule=events.Schedule.cron(hour="2", minute="0"),
                targets=[targets.LambdaFunction(ingest_fn)],
            )

        # ───────────────────────────────────────── 6. HTTP API (public)
        api = apigw.HttpApi(
            self, "HttpApi",
            api_name=f"flare-api-{stage}",
            cors_preflight=apigw.CorsPreflightOptions(
                allow_origins=[
                    "https://flare-news.com",
                    "https://flare-news.vercel.app",
                    "https://flare-ui-eta.vercel.app",
                    "http://localhost:3000",
                ],
                allow_methods=[apigw.CorsHttpMethod.ANY],
            ),
        )
        # read routes
        api.add_routes(
            path="/articles",
            methods=[apigw.HttpMethod.GET],
            integration=integ.HttpLambdaIntegration("ArticlesInt", api_fn),
        )
        api.add_routes(
            path="/search",
            methods=[apigw.HttpMethod.GET],
            integration=integ.HttpLambdaIntegration("SearchInt", api_fn),
        )
        # dev-only manual ingest endpoint
        if stage == "dev":
            api.add_routes(
                path="/fetch",
                methods=[apigw.HttpMethod.GET],
                integration=integ.HttpLambdaIntegration("FetchInt", ingest_fn),
            )

        # ───────────────────────────────────────── 7. Outputs
        CfnOutput(self, "ApiUrl", value=api.url,
                  export_name=f"FlareApiUrl-{stage}")
        CfnOutput(self, "DomainEndpoint", value=public_endpoint,
                  export_name=f"FlareDomain-{stage}")
