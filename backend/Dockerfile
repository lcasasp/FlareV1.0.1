# ----------- Lambda base (Python 3.12) -----------
# 1) Use the official AWS base image for Python 3.12 Lambda 
FROM public.ecr.aws/lambda/python:3.12

# 2) Install Python deps into /opt
COPY src/requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install -r requirements.txt

# 3) Copy the application code
COPY src/ ${LAMBDA_TASK_ROOT}/

RUN ls -lR ${LAMBDA_TASK_ROOT}

# 4) Set the handler (module.func)
CMD ["flare_backend.lambda_handler.lambda_handler"]
    