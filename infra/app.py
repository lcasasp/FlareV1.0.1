#!/usr/bin/env python3
import aws_cdk as cdk
from constants import DEV, PROD
from flare_api_stack import FlareApiStack

app = cdk.App()

FlareApiStack(app, "FlareApiDev",
              env=cdk.Environment(**DEV),
              stage="dev")

FlareApiStack(app, "FlareApiProd",
              env=cdk.Environment(**PROD),
              stage="prod")

app.synth()