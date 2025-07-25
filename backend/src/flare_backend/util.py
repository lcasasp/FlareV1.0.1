import json
import os
import gzip
import base64

GZIP_THRESHOLD = int(os.getenv("GZIP_THRESHOLD_BYTES", "15000"))  # ~15 KB


def json_resp(body, status=200):
    text = json.dumps(body, default=str)
    if len(text) >= GZIP_THRESHOLD and os.getenv("ENABLE_GZIP", "1") == "1":
        gz = gzip.compress(text.encode("utf-8"))
        return {
            "statusCode": status,
            "isBase64Encoded": True,  # required so API GW won’t mangle the bytes
            "headers": {
                "Content-Type": "application/json",
                "Content-Encoding": "gzip",
                # expose so browser JS can read it
                "Access-Control-Expose-Headers": "Content-Encoding, ETag"
            },
            "body": base64.b64encode(gz).decode("ascii"),
        }
    else:
        return {
            "statusCode": status,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Expose-Headers": "Content-Encoding, ETag"
            },
            "body": text,
        }
